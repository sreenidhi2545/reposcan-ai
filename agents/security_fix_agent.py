import ast
import json
import re

from agents.base_agent import BaseAgent


class SecurityFixAgent(BaseAgent):
    def _strip_markdown_fences(self, text: str) -> str:
        cleaned = (text or "").strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        return match.group(0).strip() if match else cleaned

    def _parse_json_response(self, response_text: str) -> dict:
        cleaned = self._strip_markdown_fences(response_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(cleaned)
                return json.loads(json.dumps(parsed))
            except (ValueError, SyntaxError):
                pass
            normalized = re.sub(r"\bTrue\b", "true", cleaned)
            normalized = re.sub(r"\bFalse\b", "false", normalized)
            normalized = re.sub(r"\bNone\b", "null", normalized)
            normalized = normalized.replace("'", '"')
            return json.loads(normalized)

    def fix_all_security(self, code: str, vulnerabilities: list) -> dict:
        prompt = """You are a security engineer. Fix ALL vulnerabilities. Rules:
1. Hardcoded credentials -> os.getenv()
2. SQL injection -> parameterized queries
3. Command injection -> subprocess.run(list, shell=False)
4. Weak hashing -> bcrypt for passwords, hashlib.sha256 for data
5. Insecure random -> secrets module
6. Missing input validation -> add validation
7. Path traversal -> os.path.abspath + boundary check
8. eval/exec -> ast.literal_eval or remove
9. pickle on user data -> json instead
10. verify=False -> verify=True
11. debug=True -> os.getenv()
12. Sensitive logging -> mask or remove

Return ONLY raw JSON (no markdown):
{
  'original_code': str, 'fixed_code': str,
  'fixes_applied': [{'vulnerability': str, 'severity': str,
    'line_before': str, 'line_after': str, 'explanation': str}],
  'security_score_before': int, 'security_score_after': int,
  'vulnerabilities_fixed': int, 'remaining_risks': [str],
  'security_certification': str, 'deployment_safe': bool, 'summary': str
}"""
        content = (
            f"Code:\n{code}\n\n"
            f"Vulnerabilities:\n{json.dumps(vulnerabilities, indent=2)}"
        )
        default_response = {
            "original_code": code,
            "fixed_code": code,
            "fixes_applied": [],
            "security_score_before": 0,
            "security_score_after": 0,
            "vulnerabilities_fixed": 0,
            "remaining_risks": [],
            "security_certification": "NEEDS_REVIEW",
            "deployment_safe": False,
            "summary": "",
        }
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            response_text = chat_completion.choices[0].message.content or ""
            return self._parse_json_response(response_text)
        except Exception as exc:
            failed_response = dict(default_response)
            failed_response["error"] = str(exc)
            return failed_response
