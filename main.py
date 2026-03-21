from __future__ import annotations

import base64
import json
import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field

from agents.code_quality_agent import CodeQualityAgent
from agents.code_review_agent import CodeReviewAgent
from agents.docs_agent import DocsAgent
from agents.learning_agent import LearningAgent
from agents.security_agent import SecurityAgent

load_dotenv()

GITHUB_API_BASE = "https://api.github.com"
REQUEST_TIMEOUT = 8
GROQ_MODEL = "llama-3.3-70b-versatile"
FIX_BRANCH_NAME = "reposcan-fixes"

MAX_FILES = 6
MAX_FILE_BYTES = 120_000
MAX_CHARS_PER_FILE = 500
MAX_TOTAL_CHARS = 2_500

SKIP_PATH_PREFIXES = (
    ".git/",
    ".github/",
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "__pycache__/",
    ".venv/",
    "venv/",
)

TEXT_FILENAMES = {
    "dockerfile",
    "makefile",
    "readme",
    "license",
}

TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".go", ".rs", ".rb",
    ".php", ".c", ".h", ".cpp", ".hpp", ".cs", ".swift", ".kt", ".m",
    ".mm", ".scala", ".sql", ".sh", ".ps1", ".yaml", ".yml", ".toml",
    ".ini", ".cfg", ".json", ".xml", ".md", ".txt", ".env",
}

AGENT_TIMEOUT_SECONDS = 20


class AnalyzeRequest(BaseModel):
    repo_url: str = Field(min_length=1)


class ChatRequest(BaseModel):
    repo_url: str = Field(min_length=1)
    message: str = Field(min_length=1)
    analysis: dict[str, Any] = Field(default_factory=dict)


class GenerateFixPRRequest(BaseModel):
    repo_url: str = Field(min_length=1)
    github_token: str = Field(min_length=1)
    issues: list[dict[str, Any] | str] = Field(default_factory=list)


app = FastAPI(title="AI Repository Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_github_headers() -> dict[str, str]:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "repo-analyzer-fastapi",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _github_get_json(path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{GITHUB_API_BASE}{path}"
    response = requests.get(
        url,
        params=params,
        timeout=REQUEST_TIMEOUT,
        headers=_get_github_headers(),
    )

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="Repository not found or is private.")
    if response.status_code == 403 and "rate limit" in response.text.lower():
        raise HTTPException(status_code=429, detail="GitHub API rate limit exceeded. Try again later.")
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API error ({response.status_code}) while requesting {path}",
        )

    return response.json()


def _github_headers_with_token(token: str) -> dict[str, str]:
    clean_token = token.strip()
    if not clean_token:
        raise HTTPException(status_code=400, detail="github_token is required.")
    return {
        "Accept": "application/vnd.github+json",
        "User-Agent": "repo-analyzer-fastapi",
        "Authorization": f"Bearer {clean_token}",
    }


def _github_api_raw_request(
    method: str,
    path: str,
    token: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
) -> requests.Response:
    return requests.request(
        method=method,
        url=f"{GITHUB_API_BASE}{path}",
        headers=_github_headers_with_token(token),
        params=params,
        json=json_body,
        timeout=REQUEST_TIMEOUT,
    )


def _github_api_request(
    method: str,
    path: str,
    token: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: dict[str, Any] | None = None,
    ok_statuses: tuple[int, ...] = (200, 201),
) -> dict[str, Any]:
    response = _github_api_raw_request(method, path, token, params=params, json_body=json_body)
    if response.status_code not in ok_statuses:
        try:
            payload = response.json()
            detail = payload.get("message") or str(payload)
        except ValueError:
            detail = response.text[:300]
        raise HTTPException(
            status_code=502,
            detail=f"GitHub API {method} {path} failed ({response.status_code}): {detail}",
        )
    if response.status_code == 204 or not response.text.strip():
        return {}
    try:
        payload = response.json()
        return payload if isinstance(payload, dict) else {}
    except ValueError:
        return {}


def _parse_repo_url(repo_url: str) -> tuple[str, str]:
    value = repo_url.strip()
    match = re.match(r"^https?://github\.com/([^/\s]+)/([^/\s?#]+)", value)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL.")

    owner = match.group(1)
    repo = match.group(2)
    if repo.endswith(".git"):
        repo = repo[:-4]

    if not owner or not repo:
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL.")
    return owner, repo


def _is_text_file(path: str) -> bool:
    lowered = path.lower()
    if lowered.startswith(SKIP_PATH_PREFIXES):
        return False

    filename = lowered.rsplit("/", 1)[-1]
    if filename in TEXT_FILENAMES:
        return True

    dot_index = filename.rfind(".")
    extension = filename[dot_index:] if dot_index >= 0 else ""
    return extension in TEXT_EXTENSIONS


def _decode_base64_content(value: str) -> str:
    decoded = base64.b64decode(value.encode("utf-8"))
    return decoded.decode("utf-8", errors="replace")


def _fetch_repo_text(owner: str, repo: str) -> tuple[str, list[str], str]:
    repo_meta = _github_get_json(f"/repos/{owner}/{repo}")
    default_branch = repo_meta.get("default_branch", "main")

    tree = _github_get_json(
        f"/repos/{owner}/{repo}/git/trees/{quote(default_branch, safe='')}",
        params={"recursive": "1"},
    )
    tree_items = tree.get("tree", [])
    if not isinstance(tree_items, list):
        raise HTTPException(status_code=502, detail="Unexpected GitHub API response for repository tree.")

    selected_paths: list[str] = []
    for item in tree_items:
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        size = int(item.get("size") or 0)
        if not path or size > MAX_FILE_BYTES:
            continue
        if not _is_text_file(path):
            continue
        selected_paths.append(path)
        if len(selected_paths) >= MAX_FILES:
            break

    if not selected_paths:
        raise HTTPException(status_code=422, detail="No text files found to analyze in this repository.")

    chunks: list[str] = []
    total_chars = 0
    used_paths: list[str] = []

    for path in selected_paths:
        encoded_path = quote(path, safe="/")
        content_payload = _github_get_json(
            f"/repos/{owner}/{repo}/contents/{encoded_path}",
            params={"ref": default_branch},
        )

        if isinstance(content_payload, list):
            continue

        content = ""
        if content_payload.get("encoding") == "base64" and content_payload.get("content"):
            content = _decode_base64_content(content_payload["content"].replace("\n", ""))
        elif content_payload.get("sha"):
            blob_payload = _github_get_json(f"/repos/{owner}/{repo}/git/blobs/{content_payload['sha']}")
            if blob_payload.get("encoding") == "base64" and blob_payload.get("content"):
                content = _decode_base64_content(blob_payload["content"])

        content = content.strip()
        if not content:
            continue

        excerpt = content[:MAX_CHARS_PER_FILE]
        projected_total = total_chars + len(excerpt)
        if projected_total > MAX_TOTAL_CHARS:
            break

        chunks.append(f"FILE: {path}\n{excerpt}")
        total_chars = projected_total
        used_paths.append(path)

    if not chunks:
        raise HTTPException(status_code=422, detail="Repository files were found, but no readable text content was retrieved.")

    joined_content = "\n\n".join(chunks)
    return joined_content, used_paths, default_branch


def _build_analysis_summary(analysis: dict[str, Any]) -> str:
    if not isinstance(analysis, dict):
        return "No structured analysis was provided."

    security_issues = analysis.get("security", {}).get("issues", [])
    code_issues = analysis.get("code_smells", {}).get("issues", [])
    bug_issues = analysis.get("code_smells", {}).get("bugs_detected", [])
    docs_issues = analysis.get("documentation", {}).get("issues", [])
    learning_insights = analysis.get("learning_insights", [])

    summary = {
        "repo_name": analysis.get("repo_name"),
        "health_score": analysis.get("health_score"),
        "security_score": analysis.get("security", {}).get("score"),
        "code_smells_score": analysis.get("code_smells", {}).get("score"),
        "documentation_score": analysis.get("documentation", {}).get("score"),
        "learning_insights_count": len(learning_insights) if isinstance(learning_insights, list) else 0,
        "top_security_issues": [
            (item.get("title") or item.get("issue") or "Security issue")
            for item in security_issues[:3]
            if isinstance(item, dict)
        ],
        "top_code_smells": [
            (item.get("type") or item.get("issue") or "Code quality issue")
            for item in code_issues[:3]
            if isinstance(item, dict)
        ],
        "top_bug_risks": [
            (item.get("type") or item.get("issue") or "Bug risk")
            for item in bug_issues[:3]
            if isinstance(item, dict)
        ],
        "top_doc_issues": [
            (item.get("issue") or item.get("type") or "Documentation issue")
            for item in docs_issues[:3]
            if isinstance(item, dict)
        ],
    }
    return json.dumps(summary, ensure_ascii=True)


def _get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")
    return Groq(api_key=api_key)


def _call_groq_chat(system_prompt: str, user_prompt: str, *, max_tokens: int = 800) -> str:
    try:
        client = _get_groq_client()
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=max_tokens,
        )
        reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            raise HTTPException(status_code=502, detail="Groq returned an empty response.")
        return reply
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API call failed: {exc}") from exc


def _clamp_score(value: Any) -> int:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return 0
    if number < 0:
        return 0
    if number > 100:
        return 100
    return number


def _normalize_security_issues(vulnerabilities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for item in vulnerabilities:
        normalized.append({
            "severity": str(item.get("severity", "LOW")).upper(),
            "title": item.get("issue") or item.get("title") or "Security issue detected",
            "file": item.get("file") or "unknown",
            "line": item.get("line"),
            "owasp": item.get("owasp"),
            "suggested_fix": item.get("fix"),
        })
    return normalized


def _normalize_code_smells(
    review_issues: list[dict[str, Any]],
    quality_issues: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    smells = []
    for issue in review_issues:
        smells.append({
            "type": issue.get("issue", "Code review issue"),
            "description": issue.get("impact") or issue.get("issue") or "Potential maintainability issue.",
            "suggested_fix": issue.get("fix"),
        })

    bugs = []
    for issue in quality_issues:
        bugs.append({
            "type": issue.get("type", "Code quality issue"),
            "description": issue.get("issue") or issue.get("impact") or "Potential reliability issue.",
            "suggested_fix": issue.get("fix"),
        })

    return {"issues": smells, "bugs_detected": bugs}


def _normalize_learning_insights(learning_result: dict[str, Any]) -> list[str]:
    patterns = learning_result.get("patterns_found", [])
    insights: list[str] = []
    if isinstance(patterns, list):
        for item in patterns:
            if not isinstance(item, dict):
                continue
            text = item.get("description") or item.get("pattern")
            if text:
                insights.append(str(text))
    summary = learning_result.get("summary")
    if summary and not insights:
        insights.append(str(summary))
    return insights


def _heuristic_security_fallback(content: str) -> dict[str, Any]:
    patterns = [
        (r"(api[_-]?key|secret|token)\s*=\s*['\"][^'\"]+['\"]", "Potential hardcoded secret"),
        (r"(password|passwd)\s*=\s*['\"][^'\"]+['\"]", "Potential hardcoded password"),
        (r"\beval\s*\(", "Use of eval()"),
        (r"\bexec\s*\(", "Use of exec()"),
        (r"subprocess\..*shell\s*=\s*True", "subprocess with shell=True"),
        (r"requests\.(get|post|put|delete)\(.*verify\s*=\s*False", "TLS verification disabled"),
    ]
    issues = []
    for regex, title in patterns:
        if re.search(regex, content, re.IGNORECASE | re.DOTALL):
            issues.append(
                {
                    "severity": "HIGH" if "secret" in title.lower() or "password" in title.lower() else "MEDIUM",
                    "title": title,
                    "file": "multiple",
                    "line": None,
                    "owasp": "A02",
                    "suggested_fix": "Refactor this pattern following secure coding practices.",
                }
            )
    score = max(15, 85 - (len(issues) * 12))
    risk_level = "low" if score >= 80 else "medium" if score >= 60 else "high" if score >= 40 else "critical"
    return {
        "score": score,
        "issues": issues,
        "summary": "Heuristic fallback score used due upstream model/parsing issue.",
        "risk_level": risk_level,
    }


def _heuristic_docs_fallback(content: str) -> dict[str, Any]:
    function_count = len(re.findall(r"^\s*(def|function)\s+\w+", content, re.MULTILINE))
    class_count = len(re.findall(r"^\s*class\s+\w+", content, re.MULTILINE))
    block_count = function_count + class_count
    docstring_count = len(re.findall(r'("""|\'\'\')', content))
    comment_count = len(re.findall(r"^\s*#", content, re.MULTILINE))
    coverage_ratio = (docstring_count + comment_count) / max(1, block_count * 2)
    score = max(20, min(95, int(35 + (coverage_ratio * 70))))
    issues = []
    if score < 70:
        issues.append(
            {
                "function": "multiple",
                "issue": "Documentation coverage appears low",
                "confidence": 75,
                "fix": "Add docstrings to functions/classes and improve README/module comments.",
            }
        )
    return {
        "score": score,
        "issues": issues,
        "summary": "Heuristic fallback documentation score used due parser/model mismatch.",
    }


def _heuristic_learning_fallback(content: str) -> dict[str, Any]:
    patterns = []
    checks = [
        (r"\bTODO\b|\bFIXME\b", "todo_or_fixme_markers"),
        (r"magic[_\s-]?number|=\s*\d{2,}", "magic_numbers"),
        (r"except\s*:\s*pass", "silent_exception_handling"),
        (r"print\s*\(", "debug_prints_in_code"),
    ]
    for regex, name in checks:
        if re.search(regex, content, re.IGNORECASE):
            patterns.append(
                {
                    "pattern": name,
                    "severity": "medium",
                    "confidence": 70,
                    "description": f"Detected pattern: {name}",
                    "how_to_fix": "Refactor this pattern with explicit, maintainable alternatives.",
                    "example_fix": "",
                    "risk_level": "medium",
                }
            )
    score = max(30, 85 - (len(patterns) * 8))
    return {
        "patterns_found": patterns,
        "score": score,
        "summary": "Heuristic fallback learning score used due parser/model mismatch.",
        "risk_level": "medium" if score < 75 else "low",
    }


def _run_agent_with_timeout(method, repo_content: str) -> dict[str, Any]:
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(method, repo_content)
    try:
        result = future.result(timeout=AGENT_TIMEOUT_SECONDS)
        if isinstance(result, dict):
            return result
        return {"error": "Agent returned non-dict response"}
    except FutureTimeoutError:
        return {"error": f"Agent timed out after {AGENT_TIMEOUT_SECONDS}s"}
    except Exception as exc:  # pragma: no cover
        return {"error": str(exc)}
    finally:
        executor.shutdown(wait=False, cancel_futures=True)


def _strip_code_fences(text: str) -> str:
    fenced = re.search(r"```(?:[\w+-]+)?\n([\s\S]*?)```", text)
    if fenced:
        return fenced.group(1).strip()
    return text.strip()


def _issue_to_text(issue: dict[str, Any] | str) -> str:
    if isinstance(issue, str):
        return issue
    if not isinstance(issue, dict):
        return "Unstructured issue"
    parts = [
        str(issue.get("title") or issue.get("issue") or issue.get("type") or "Issue"),
        str(issue.get("description") or issue.get("impact") or ""),
        f"file={issue.get('file') or issue.get('path') or issue.get('function') or 'unknown'}",
        f"severity={issue.get('severity') or 'unknown'}",
    ]
    return " | ".join([p for p in parts if p and p != " | "])


def _resolve_issue_file(issue: dict[str, Any] | str) -> str | None:
    if not isinstance(issue, dict):
        return None

    for key in ("file", "path", "function", "target_file", "fallback_file"):
        candidate = issue.get(key)
        if not isinstance(candidate, str):
            continue
        value = candidate.strip()
        if not value:
            continue
        lowered = value.lower()
        if lowered in {"unknown", "multiple", "n/a"}:
            continue
        if ":" in value and "/" in value:
            value = value.split(":", 1)[0]
        return value.lstrip("/").replace("\\", "/")
    return None


def _is_readme_issue_file(file_path: str | None) -> bool:
    if not file_path:
        return False
    normalized = file_path.strip().replace("\\", "/")
    return normalized.rsplit("/", 1)[-1].lower() == "readme.md"


def _fetch_file_from_repo(owner: str, repo: str, file_path: str, branch: str, token: str) -> tuple[str, str]:
    payload = _github_api_request(
        "GET",
        f"/repos/{owner}/{repo}/contents/{quote(file_path, safe='/')}",
        token,
        params={"ref": branch},
        ok_statuses=(200,),
    )
    encoded = payload.get("content")
    sha = payload.get("sha")
    if not encoded or not sha:
        raise HTTPException(status_code=422, detail=f"Unable to read file '{file_path}' for automated fix.")
    content = _decode_base64_content(encoded.replace("\n", ""))
    return content, str(sha)


def _generate_fixed_content(repo_url: str, file_path: str, original_content: str, issue: dict[str, Any] | str) -> str:
    issue_text = _issue_to_text(issue)
    system_prompt = (
        "You are an expert software engineer creating safe, minimal code fixes.\n"
        "Preserve existing behavior except what is needed to address the issue."
    )
    user_prompt = (
        f"Repository: {repo_url}\n"
        f"File path: {file_path}\n"
        f"Fix this issue in the code: {issue_text}.\n"
        "Return ONLY the complete fixed file, no explanation, no markdown.\n\n"
        "Current file contents:\n"
        f"{original_content}\n"
    )
    fixed = _call_groq_chat(system_prompt, user_prompt, max_tokens=1400)
    cleaned = _strip_code_fences(fixed)
    return cleaned or original_content


def _commit_text_file(
    owner: str,
    repo: str,
    branch: str,
    file_path: str,
    file_content: str,
    token: str,
    message: str,
    *,
    sha: str | None = None,
) -> None:
    encoded = base64.b64encode(file_content.encode("utf-8")).decode("utf-8")
    body: dict[str, Any] = {
        "message": message,
        "content": encoded,
        "branch": branch,
    }
    if sha:
        body["sha"] = sha
    _github_api_request(
        "PUT",
        f"/repos/{owner}/{repo}/contents/{quote(file_path, safe='/')}",
        token,
        json_body=body,
        ok_statuses=(200, 201),
    )


def _recreate_fix_branch(owner: str, repo: str, token: str, base_branch: str = "main") -> str:
    base_ref = _github_api_request(
        "GET",
        f"/repos/{owner}/{repo}/git/ref/heads/{quote(base_branch, safe='')}",
        token,
        ok_statuses=(200,),
    )
    base_sha = base_ref.get("object", {}).get("sha")
    if not base_sha:
        raise HTTPException(status_code=502, detail=f"Unable to read latest SHA from '{base_branch}' branch.")

    existing_branch = _github_api_raw_request(
        "GET",
        f"/repos/{owner}/{repo}/git/ref/heads/{quote(FIX_BRANCH_NAME, safe='')}",
        token,
    )
    if existing_branch.status_code == 200:
        delete_resp = _github_api_raw_request(
            "DELETE",
            f"/repos/{owner}/{repo}/git/refs/heads/{quote(FIX_BRANCH_NAME, safe='')}",
            token,
        )
        if delete_resp.status_code not in (204,):
            try:
                payload = delete_resp.json()
                detail = payload.get("message") or str(payload)
            except ValueError:
                detail = delete_resp.text[:300]
            raise HTTPException(status_code=502, detail=f"Failed to delete existing branch '{FIX_BRANCH_NAME}': {detail}")
    elif existing_branch.status_code not in (404,):
        try:
            payload = existing_branch.json()
            detail = payload.get("message") or str(payload)
        except ValueError:
            detail = existing_branch.text[:300]
        raise HTTPException(status_code=502, detail=f"Unable to inspect existing branch: {detail}")

    create_branch_resp = _github_api_raw_request(
        "POST",
        f"/repos/{owner}/{repo}/git/refs",
        token,
        json_body={"ref": f"refs/heads/{FIX_BRANCH_NAME}", "sha": base_sha},
    )
    if create_branch_resp.status_code != 201:
        try:
            payload = create_branch_resp.json()
            detail = payload.get("message") or str(payload)
        except ValueError:
            detail = create_branch_resp.text[:300]
        raise HTTPException(
            status_code=502,
            detail=(
                f"Unable to create branch '{FIX_BRANCH_NAME}' on the source repository "
                f"({create_branch_resp.status_code}): {detail}"
            ),
        )
    return FIX_BRANCH_NAME


def _generate_fix_suggestion(repo_url: str, issue: dict[str, Any] | str) -> str:
    issue_text = _issue_to_text(issue)
    system_prompt = (
        "You are a senior software engineer generating practical fix suggestions.\n"
        "Return concise markdown with: root cause, suggested code change, and validation steps."
    )
    user_prompt = (
        f"Repository: {repo_url}\n"
        f"Issue: {issue_text}\n"
        "Generate a concrete fix suggestion."
    )
    return _call_groq_chat(system_prompt, user_prompt, max_tokens=700)


def _upsert_markdown_file(
    owner: str,
    repo: str,
    branch: str,
    file_path: str,
    markdown_content: str,
    token: str,
    message: str,
) -> None:
    existing_resp = _github_api_raw_request(
        "GET",
        f"/repos/{owner}/{repo}/contents/{quote(file_path, safe='/')}",
        token,
        params={"ref": branch},
    )
    existing_sha: str | None = None
    if existing_resp.status_code == 200:
        payload = existing_resp.json()
        existing_sha = payload.get("sha")
    elif existing_resp.status_code != 404:
        try:
            payload = existing_resp.json()
            detail = payload.get("message") or str(payload)
        except ValueError:
            detail = existing_resp.text[:300]
        raise HTTPException(status_code=502, detail=f"Unable to access '{file_path}' on branch '{branch}': {detail}")

    _commit_text_file(
        owner,
        repo,
        branch,
        file_path,
        markdown_content,
        token,
        message,
        sha=existing_sha,
    )


def _create_or_reuse_pr(
    owner: str,
    repo: str,
    head: str,
    base: str,
    body: str,
    token: str,
) -> str:
    response = _github_api_raw_request(
        "POST",
        f"/repos/{owner}/{repo}/pulls",
        token,
        json_body={
            "title": "RepoScan AI: Automated Fix Suggestions",
            "head": head,
            "base": base,
            "body": body,
        },
    )
    if response.status_code == 201:
        payload = response.json()
        return str(payload.get("html_url"))

    try:
        payload = response.json()
        message = str(payload.get("message", ""))
    except ValueError:
        payload = {}
        message = response.text[:300]

    if response.status_code == 422 and "already exists" in message.lower():
        pulls_resp = _github_api_raw_request(
            "GET",
            f"/repos/{owner}/{repo}/pulls",
            token,
            params={"state": "open", "head": head},
        )
        if pulls_resp.status_code == 200:
            pulls = pulls_resp.json()
            if isinstance(pulls, list) and pulls:
                return str(pulls[0].get("html_url"))

    raise HTTPException(
        status_code=502,
        detail=f"Unable to create pull request ({response.status_code}): {message or payload}",
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
def analyze_repository(payload: AnalyzeRequest) -> dict[str, Any]:
    owner, repo = _parse_repo_url(payload.repo_url)
    repo_content, analyzed_files, branch = _fetch_repo_text(owner, repo)

    ordered_agents = [
        ("security", SecurityAgent, "deep_scan"),
        ("code_review", CodeReviewAgent, "review"),
        ("code_quality", CodeQualityAgent, "analyze"),
        ("documentation", DocsAgent, "check"),
        ("learning", LearningAgent, "learn"),
    ]

    agent_results: dict[str, dict[str, Any]] = {}
    agent_status: dict[str, str] = {}

    for key, agent_cls, method_name in ordered_agents:
        try:
            time.sleep(2)
            agent = agent_cls()
            method = getattr(agent, method_name)
            agent_results[key] = _run_agent_with_timeout(method, repo_content)
            if isinstance(agent_results[key], dict) and agent_results[key].get("error"):
                agent_status[key] = "failed"
            else:
                agent_status[key] = "complete"
        except Exception as exc:
            agent_results[key] = {"error": str(exc)}
            agent_status[key] = "failed"

    security_result = agent_results.get("security", {})
    code_review_result = agent_results.get("code_review", {})
    code_quality_result = agent_results.get("code_quality", {})
    docs_result = agent_results.get("documentation", {})
    if isinstance(docs_result, dict) and "raw" in docs_result:
        match = re.search(r'"score":\s*(\d+)', docs_result["raw"])
        if match:
            docs_result["score"] = int(match.group(1))
        else:
            docs_result["score"] = 50
    learning_result = agent_results.get("learning", {})

    print("=== DEBUG ===")
    print("SECURITY:", agent_results.get("security", {}))
    print("REVIEW:", agent_results.get("code_review", {}))
    print("QUALITY:", agent_results.get("code_quality", {}))
    print("DOCS:", agent_results.get("documentation", {}))
    print("LEARNING:", agent_results.get("learning", {}))
    print("=== END DEBUG ===")

    security_score = _clamp_score(security_result.get("security_score") or security_result.get("score") or 0)
    review_score = _clamp_score(code_review_result.get("score"))
    quality_score = _clamp_score(code_quality_result.get("score"))
    docs_score = _clamp_score(docs_result.get("score"))
    learning_score = _clamp_score(learning_result.get("score"))

    if security_score == 0:
        security_fallback = _heuristic_security_fallback(repo_content)
        security_score = _clamp_score(security_fallback.get("score"))
        security_result = {
            "security_score": security_score,
            "risk_level": security_fallback.get("risk_level", "unknown"),
            "summary": security_fallback.get("summary", ""),
            "vulnerabilities": [],
        }
        if not agent_results.get("security", {}).get("error"):
            agent_results["security"] = security_result

    if docs_score == 0:
        docs_fallback = _heuristic_docs_fallback(repo_content)
        docs_score = _clamp_score(docs_fallback.get("score"))
        if isinstance(docs_result, dict):
            docs_result = {**docs_result, **docs_fallback}
        else:
            docs_result = docs_fallback

    if learning_score == 0:
        learning_fallback = _heuristic_learning_fallback(repo_content)
        learning_score = _clamp_score(learning_fallback.get("score"))
        if isinstance(learning_result, dict):
            learning_result = {**learning_result, **learning_fallback}
        else:
            learning_result = learning_fallback

    if review_score == 0:
        review_score = max(35, _clamp_score(quality_score))
    if quality_score == 0:
        quality_score = max(35, _clamp_score(review_score))

    available_scores = [s for s in [security_score, review_score, quality_score, docs_score, learning_score] if s > 0]
    health_score = round(sum(available_scores) / len(available_scores)) if available_scores else 0

    vulnerabilities = security_result.get("vulnerabilities", [])
    normalized_security_issues = _normalize_security_issues(vulnerabilities if isinstance(vulnerabilities, list) else [])

    review_issues = code_review_result.get("issues", [])
    quality_issues = code_quality_result.get("issues", [])
    code_smells = _normalize_code_smells(
        review_issues if isinstance(review_issues, list) else [],
        quality_issues if isinstance(quality_issues, list) else [],
    )

    docs_issues = docs_result.get("issues", [])
    if not isinstance(docs_issues, list):
        docs_issues = []

    return {
        "repo_url": payload.repo_url,
        "repo_name": f"{owner}/{repo}",
        "branch": branch,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
        "files_analyzed": len(analyzed_files),
        "analyzed_file_paths": analyzed_files,
        "health_score": health_score,
        "security": {
            "score": security_score,
            "issues": normalized_security_issues,
            "summary": security_result.get("summary", ""),
            "risk_level": security_result.get("risk_level", "unknown"),
        },
        "code_smells": {
            "score": round((review_score + quality_score) / 2) if (review_score or quality_score) else 0,
            "issues": code_smells["issues"],
            "bugs_detected": code_smells["bugs_detected"],
        },
        "documentation": {
            "score": docs_score,
            "issues": docs_issues,
            "summary": docs_result.get("summary", ""),
        },
        "learning_insights": _normalize_learning_insights(learning_result),
        "dependencies": {"score": 65, "risks": []},
        "developer_reputation": {"score": 70, "contributors": [], "metrics": {}, "pr_analysis": {}},
        "agent_execution_status": agent_status,
        "agent_order": [name for name, _, _ in ordered_agents],
        "agent_results": agent_results,
    }


@app.post("/chat")
def chat_with_repo(payload: ChatRequest) -> dict[str, str]:
    analysis_summary = _build_analysis_summary(payload.analysis)
    system_prompt = (
        f"You are a code review expert. You have analyzed the repository {payload.repo_url} "
        f"and here are the results: {analysis_summary}. "
        "Answer the user's question based on this data. If information is missing, say so clearly."
    )
    reply = _call_groq_chat(system_prompt, payload.message, max_tokens=900)
    return {"reply": reply}


@app.post("/generate-fix-pr")
def generate_fix_pr(payload: GenerateFixPRRequest) -> dict[str, str]:
    owner, repo = _parse_repo_url(payload.repo_url)
    token = payload.github_token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="github_token is required.")

    top_issues = payload.issues[:3]
    if not top_issues:
        raise HTTPException(status_code=400, detail="issues must include at least one issue.")

    repo_meta = _github_api_request("GET", f"/repos/{owner}/{repo}", token, ok_statuses=(200,))
    base_branch = str(repo_meta.get("default_branch") or "main")
    branch_name = _recreate_fix_branch(owner, repo, token, base_branch=base_branch)

    issue_lines = [f"- {_issue_to_text(issue)}" for issue in top_issues]
    change_lines: list[str] = []
    fallback_sections: list[str] = []

    for idx, issue in enumerate(top_issues, start=1):
        issue_label = _issue_to_text(issue)
        issue_file = _resolve_issue_file(issue)
        is_unknown = not issue_file or issue_file.strip().lower() == "unknown"
        is_readme = _is_readme_issue_file(issue_file)

        if is_unknown or is_readme:
            reason = "file path is unknown" if is_unknown else f"file '{issue_file}' is README.md"
            suggestion = _generate_fix_suggestion(payload.repo_url, issue)
            fallback_sections.append(
                f"## Fix Suggestion {idx}\n"
                f"**Issue:** {issue_label}\n"
                f"**Reason:** {reason}\n\n"
                f"{_strip_code_fences(suggestion)}\n"
            )
            change_lines.append(f"- Added fallback suggestion for issue {idx} in `REPOSCAN_FIXES.md` ({reason}).")
            continue

        try:
            original_content, file_sha = _fetch_file_from_repo(owner, repo, issue_file, branch_name, token)
            fixed_content = _generate_fixed_content(payload.repo_url, issue_file, original_content, issue)
        except HTTPException as exc:
            detail = str(exc.detail).replace("\n", " ").strip()
            suggestion = _generate_fix_suggestion(payload.repo_url, issue)
            fallback_sections.append(
                f"## Fix Suggestion {idx}\n"
                f"**Issue:** {issue_label}\n"
                f"**Reason:** failed to fetch or prepare auto-fix for `{issue_file}` ({detail})\n\n"
                f"{_strip_code_fences(suggestion)}\n"
            )
            change_lines.append(
                f"- Added fallback suggestion for issue {idx} in `REPOSCAN_FIXES.md` "
                f"(auto-fix setup failed for `{issue_file}`)."
            )
            continue

        if fixed_content.strip() == original_content.strip():
            suggestion = _generate_fix_suggestion(payload.repo_url, issue)
            fallback_sections.append(
                f"## Fix Suggestion {idx}\n"
                f"**Issue:** {issue_label}\n"
                f"**Reason:** model returned unchanged content for `{issue_file}`\n\n"
                f"{_strip_code_fences(suggestion)}\n"
            )
            change_lines.append(
                f"- Added fallback suggestion for issue {idx} in `REPOSCAN_FIXES.md` "
                f"(model returned unchanged content for `{issue_file}`)."
            )
            continue

        _commit_text_file(
            owner,
            repo,
            branch_name,
            issue_file,
            fixed_content,
            token,
            message=f"RepoScan AI: fix issue {idx} in {issue_file}",
            sha=file_sha,
        )
        change_lines.append(f"- Updated `{issue_file}` for issue {idx}.")

    if fallback_sections:
        markdown_body = (
            "# RepoScan AI Automated Fix Suggestions\n\n"
            f"- Repository: `{owner}/{repo}`\n"
            f"- Source branch: `{base_branch}`\n"
            f"- Generated branch: `{branch_name}`\n"
            f"- Generated at: `{datetime.now(timezone.utc).isoformat()}`\n\n"
            "## Issues Selected (Top 3)\n"
            + "\n".join(issue_lines)
            + "\n\n"
            + "\n".join(fallback_sections)
        )

        _upsert_markdown_file(
            owner,
            repo,
            branch_name,
            "REPOSCAN_FIXES.md",
            markdown_body,
            token,
            message="RepoScan AI: add fallback fix suggestions",
        )

    pr_body = (
        "This pull request was generated by RepoScan AI.\n\n"
        "### Issues Addressed\n"
        + "\n".join(issue_lines)
        + "\n\n"
        "### Changes Made\n"
        + ("\n".join(change_lines) if change_lines else "- No changes were generated.")
    )

    pr_url = _create_or_reuse_pr(owner, repo, f"{owner}:{branch_name}", base_branch, pr_body, token)
    return {"pr_url": pr_url}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
