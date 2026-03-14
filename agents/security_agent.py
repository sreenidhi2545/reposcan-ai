import ast
import json
import re

from agents.base_agent import BaseAgent


class SecurityAgent(BaseAgent):
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

    def _run_security_prompt(self, prompt: str, content: str, default_response: dict) -> dict:
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

    def deep_scan(self, code: str) -> dict:
        prompt = """You are a world-class application security expert (AppSec). You have deep knowledge of OWASP Top 10, CVEs, and security best practices. Analyze this code extremely carefully for ALL security vulnerabilities.

Check these 7 categories thoroughly:
CATEGORY 1 - Hardcoded Secrets: passwords, API keys, tokens, AWS keys (AKIA...), private keys, JWT secrets, OAuth tokens, database passwords, connection strings, SSH keys
CATEGORY 2 - Injection Attacks: raw SQL with string formatting, os.system() with user input, subprocess with shell=True, eval()/exec() with user input, pickle.loads() on user data, yaml.load() without Loader
CATEGORY 3 - Broken Authentication: missing auth decorators, weak password validation, no rate limiting, hardcoded admin credentials, missing session expiry
CATEGORY 4 - Sensitive Data Exposure: print with passwords, logging sensitive data, PII unencrypted, passwords in error messages
CATEGORY 5 - Broken Access Control: missing authorization checks, path traversal (../), missing role checks, IDOR
CATEGORY 6 - Security Misconfiguration: debug=True, CORS allowing *, missing security headers, default credentials
CATEGORY 7 - Cryptographic Failures: MD5/SHA1 for passwords, random for tokens, hardcoded keys, ECB mode, verify=False, weak key sizes

Return ONLY raw JSON (no markdown, no backticks):
{
  'vulnerabilities': [{'category': str, 'line': int, 'severity': 'critical/high/medium/low',
    'confidence': int, 'owasp': str, 'cve': str or null, 'issue': str, 'impact': str,
    'fix': str, 'code_example': str, 'requires_immediate_fix': bool}],
  'security_score': int, 'risk_level': str, 'critical_count': int,
  'high_count': int, 'medium_count': int, 'low_count': int,
  'owasp_violations': [str], 'requires_immediate_action': bool,
  'block_deployment': bool, 'summary': str
}"""
        default_response = {
            "vulnerabilities": [],
            "security_score": 0,
            "risk_level": "unknown",
            "critical_count": 0,
            "high_count": 0,
            "medium_count": 0,
            "low_count": 0,
            "owasp_violations": [],
            "requires_immediate_action": False,
            "block_deployment": False,
            "summary": "",
        }
        return self._run_security_prompt(prompt, code, default_response)

    def check_owasp(self, code: str) -> dict:
        prompt = """Check all OWASP Top 10 2021 (A01-A10). Return ONLY raw JSON:
{
  'owasp_results': [{'id': str, 'name': str,
    'status': 'VIOLATED/CLEAR/NEEDS_REVIEW', 'severity': str, 'details': str}],
  'total_violations': int, 'owasp_score': int,
  'certification': 'PASS/FAIL/NEEDS_REVIEW', 'summary': str
}"""
        default_response = {
            "owasp_results": [],
            "total_violations": 0,
            "owasp_score": 0,
            "certification": "NEEDS_REVIEW",
            "summary": "",
        }
        return self._run_security_prompt(prompt, code, default_response)
