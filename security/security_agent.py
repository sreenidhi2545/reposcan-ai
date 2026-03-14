import os, sys, re, json
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

from agents.base_agent import BaseAgent

class SecurityAgent(BaseAgent):

    def deep_scan(self, code: str) -> dict:
        prompt = """You are a world-class application
security expert with deep knowledge of OWASP Top 10.
Analyze this code for ALL security vulnerabilities.

Check these 7 categories:

CATEGORY 1 - Hardcoded Secrets:
Look for: passwords, API keys, AWS keys (AKIA...),
tokens, JWT secrets, database passwords,
connection strings with credentials

CATEGORY 2 - Injection Attacks:
Look for: raw SQL with string formatting,
os.system() with user input,
subprocess with shell=True and user input,
eval() or exec() with user input,
pickle.loads() on user data

CATEGORY 3 - Broken Authentication:
Look for: missing authentication checks,
weak password validation,
no rate limiting on login,
hardcoded admin credentials

CATEGORY 4 - Sensitive Data Exposure:
Look for: passwords in print statements,
logging sensitive data,
credit card numbers in plain text,
sensitive data in error messages

CATEGORY 5 - Broken Access Control:
Look for: missing authorization checks,
path traversal (../../../ patterns),
direct object references without validation

CATEGORY 6 - Security Misconfiguration:
Look for: debug=True in code,
CORS allowing all origins with *,
verbose error messages with stack traces,
default or hardcoded credentials

CATEGORY 7 - Cryptographic Failures:
Look for: MD5 or SHA1 for password hashing,
random module for security tokens,
hardcoded encryption keys,
SSL verify=False

Return ONLY raw JSON no markdown no backticks:
{
  "vulnerabilities": [
    {
      "category": "Hardcoded Secrets",
      "line": 4,
      "severity": "critical",
      "confidence": 100,
      "owasp": "A02 - Cryptographic Failures",
      "cve": "CWE-798",
      "issue": "Hardcoded password in source code",
      "impact": "Anyone with code access can steal credentials",
      "fix": "Use os.getenv('PASSWORD') instead",
      "code_example": "password = os.getenv('MY_PASSWORD')",
      "requires_immediate_fix": true
    }
  ],
  "security_score": 15,
  "risk_level": "critical",
  "critical_count": 3,
  "high_count": 2,
  "medium_count": 1,
  "low_count": 1,
  "owasp_violations": ["A02", "A03"],
  "requires_immediate_action": true,
  "block_deployment": true,
  "summary": "one line summary"
}"""
        result = self.analyze(code, prompt)
        if "raw" in result:
            match = re.search(r'\{.*\}', result["raw"], re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except:
                    pass
        return result

    def check_owasp(self, code: str) -> dict:
        prompt = """You are an OWASP security expert.
Check this code against OWASP Top 10 2021.

Check ALL of these:
A01 - Broken Access Control
A02 - Cryptographic Failures
A03 - Injection
A04 - Insecure Design
A05 - Security Misconfiguration
A06 - Vulnerable and Outdated Components
A07 - Authentication Failures
A08 - Software Integrity Failures
A09 - Security Logging Failures
A10 - Server Side Request Forgery

Return ONLY raw JSON no markdown no backticks:
{
  "owasp_results": [
    {
      "id": "A01",
      "name": "Broken Access Control",
      "status": "VIOLATED",
      "severity": "critical",
      "details": "what was found"
    }
  ],
  "total_violations": 3,
  "owasp_score": 70,
  "certification": "FAIL",
  "summary": "one line summary"
}
Status must be exactly: VIOLATED, CLEAR, or NEEDS_REVIEW"""
        result = self.analyze(code, prompt)
        if "raw" in result:
            match = re.search(r'\{.*\}', result["raw"], re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except:
                    pass
        return result

