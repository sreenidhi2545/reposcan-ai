import base64
import json
import os
import re
from typing import Dict, List, Optional, Tuple
from urllib import error, parse, request

from dotenv import load_dotenv

load_dotenv()

GITHUB_API_BASE = "https://api.github.com"


def _get_token() -> Optional[str]:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    return token or None


def _get_headers() -> Dict[str, str]:
    token = _get_token()
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "RepoGuard-AI",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _parse_repo_url(repo_url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    match = re.match(
        r"^https://github\.com/(?P<owner>[^/]+)/(?P<repo>[^/#?]+?)(?:\.git)?/?(?:$|[?#])",
        repo_url.strip(),
    )
    if not match:
        return None, None, "Invalid GitHub repository URL"
    return match.group("owner"), match.group("repo"), None


def _request_json(
    url: str,
    params: Optional[dict] = None,
    method: str = "GET",
    body: Optional[dict] = None,
) -> Tuple[Optional[object], Optional[int], Dict[str, str], Optional[str]]:
    if params:
        query_string = parse.urlencode(params)
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}{query_string}"

    data = None
    headers = dict(_get_headers())
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            payload = json.loads(raw) if raw else None
            return payload, response.status, dict(response.headers.items()), None
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
            message = payload.get("message", raw)
        except ValueError:
            message = raw
        return None, exc.code, dict(exc.headers.items()), message
    except error.URLError as exc:
        return None, None, {}, str(exc.reason)
    except ValueError as exc:
        return None, None, {}, f"Invalid JSON response: {exc}"


def _request_text(url: str) -> Tuple[Optional[str], Optional[str]]:
    req = request.Request(url, headers=_get_headers(), method="GET")
    try:
        with request.urlopen(req, timeout=30) as response:
            return response.read().decode("utf-8"), None
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return None, raw
    except error.URLError as exc:
        return None, str(exc.reason)


def verify_token() -> dict:
    token = _get_token()
    if not token:
        return {"valid": False, "error": "Invalid or expired token"}

    payload, status, headers, error_message = _request_json(f"{GITHUB_API_BASE}/user")
    if error_message or status != 200 or not isinstance(payload, dict):
        return {"valid": False, "error": "Invalid or expired token"}

    return {
        "valid": True,
        "user": payload.get("login", ""),
        "scopes": headers.get("X-OAuth-Scopes", ""),
    }


def _get_file_content(file_url: str) -> Tuple[Optional[str], Optional[str]]:
    payload, _, _, error_message = _request_json(file_url)
    if error_message or not isinstance(payload, dict):
        return None, error_message or "Unable to fetch file content"

    if payload.get("encoding") == "base64" and payload.get("content"):
        try:
            decoded = base64.b64decode(payload["content"])
            return decoded.decode("utf-8"), None
        except (ValueError, UnicodeDecodeError) as exc:
            return None, f"Unable to decode file content: {exc}"

    download_url = payload.get("download_url")
    if not download_url:
        return None, "File content is unavailable"

    return _request_text(download_url)


def get_repo_code(repo_url: str) -> dict:
    owner, repo, error_message = _parse_repo_url(repo_url)
    if error_message:
        return {
            "success": False,
            "repo_name": "",
            "is_private": False,
            "files": [],
            "total_files": 0,
            "error": error_message,
        }

    repo_payload, _, _, repo_error = _request_json(f"{GITHUB_API_BASE}/repos/{owner}/{repo}")
    if repo_error or not isinstance(repo_payload, dict):
        return {
            "success": False,
            "repo_name": repo or "",
            "is_private": False,
            "files": [],
            "total_files": 0,
            "error": repo_error or "Unable to fetch repository details",
        }

    repo_name = repo_payload.get("full_name", f"{owner}/{repo}")
    is_private = bool(repo_payload.get("private", False))
    files: List[dict] = []
    first_error: Optional[str] = None

    def walk_contents(contents_url: str) -> None:
        nonlocal first_error
        if first_error:
            return

        payload, _, _, contents_error = _request_json(contents_url)
        if contents_error:
            first_error = contents_error
            return

        items = payload if isinstance(payload, list) else [payload]
        for item in items:
            if not isinstance(item, dict):
                continue
            item_type = item.get("type")
            item_path = item.get("path", "")
            item_url = item.get("url", "")

            if item_type == "dir" and item_url:
                walk_contents(item_url)
                continue

            if item_type == "file" and item_path.endswith(".py") and item_url:
                content, content_error = _get_file_content(item_url)
                if content_error:
                    first_error = content_error
                    return
                files.append(
                    {
                        "name": item.get("name", ""),
                        "content": content or "",
                        "path": item_path,
                    }
                )

    walk_contents(f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/")

    return {
        "success": first_error is None,
        "repo_name": repo_name,
        "is_private": is_private,
        "files": files,
        "total_files": len(files),
        "error": first_error,
    }


def get_pr_code(repo_url: str, pr_number: int) -> dict:
    owner, repo, error_message = _parse_repo_url(repo_url)
    if error_message:
        return {
            "success": False,
            "pr_number": pr_number,
            "files_changed": 0,
            "code_diff": "",
            "requirements": None,
            "file_names": [],
            "error": error_message,
        }

    all_files: List[dict] = []
    page = 1

    while True:
        payload, _, _, pr_error = _request_json(
            f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls/{pr_number}/files",
            params={"per_page": 100, "page": page},
        )
        if pr_error or not isinstance(payload, list):
            return {
                "success": False,
                "pr_number": pr_number,
                "files_changed": len(all_files),
                "code_diff": "",
                "requirements": None,
                "file_names": [item.get("filename", "") for item in all_files],
                "error": pr_error or "Unable to fetch pull request files",
            }

        all_files.extend(item for item in payload if isinstance(item, dict))
        if len(payload) < 100:
            break
        page += 1

    file_names = [item.get("filename", "") for item in all_files]
    code_sections: List[str] = []
    requirements_patch = None

    for item in all_files:
        filename = item.get("filename", "")
        patch = item.get("patch") or f"[No patch available for {filename}]"
        code_sections.append(f"File: {filename}\n{patch}")
        if filename.lower().endswith("requirements.txt"):
            requirements_patch = patch

    return {
        "success": True,
        "pr_number": pr_number,
        "files_changed": len(all_files),
        "code_diff": "\n\n".join(code_sections),
        "requirements": requirements_patch,
        "file_names": file_names,
        "error": None,
    }


def post_security_report(repo_url: str, pr_number: int, report: dict) -> bool:
    owner, repo, error_message = _parse_repo_url(repo_url)
    if error_message:
        return False

    vulnerabilities = report.get("vulnerabilities", [])
    body_lines = [
        "## RepoGuard AI Security Report",
        "",
        f"- Security Score: {report.get('security_score', 0)}/100",
        f"- Risk Level: {report.get('risk_level', 'unknown')}",
        f"- Block Deployment: {report.get('block_deployment', False)}",
        f"- Summary: {report.get('summary', 'No summary provided')}",
        "",
    ]

    for severity in ("critical", "high", "medium", "low"):
        severity_items = [
            item for item in vulnerabilities
            if isinstance(item, dict) and str(item.get("severity", "")).lower() == severity
        ]
        if not severity_items:
            continue
        body_lines.append(f"### {severity.title()} Severity Findings ({len(severity_items)})")
        body_lines.append("")
        for item in severity_items:
            body_lines.append(
                f"- Line {item.get('line', '?')} | {item.get('category', 'Unknown')} | "
                f"OWASP: {item.get('owasp', 'N/A')} | Confidence: {item.get('confidence', '?')}%"
            )
            body_lines.append(f"  Issue: {item.get('issue', 'Unknown issue')}")
            body_lines.append(f"  Fix: {item.get('fix', 'No fix provided')}")
            cve = item.get("cve")
            if cve:
                body_lines.append(f"  CVE: {cve}")
        body_lines.append("")

    _, status, _, post_error = _request_json(
        f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{pr_number}/comments",
        method="POST",
        body={"body": "\n".join(body_lines)},
    )
    return post_error is None and status == 201
