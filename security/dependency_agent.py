import os, sys, re, json
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

from agents.base_agent import BaseAgent

class DependencyAgent(BaseAgent):

    def scan(self, requirements: str) -> dict:
        if not requirements or requirements.strip() == "":
            return {
                "vulnerabilities": [],
                "score": 100,
                "risk_level": "low",
                "critical_count": 0,
                "high_count": 0,
                "total_packages_scanned": 0,
                "vulnerable_packages": 0,
                "summary": "No requirements provided"
            }
        prompt = """You are a dependency security expert.
Analyze these Python package requirements for
known vulnerabilities and security risks.

Check for:
- Packages with known CVE vulnerabilities
- Outdated packages with security patches available
- Packages that have been deprecated or abandoned
- Packages with known malicious versions

Common vulnerable packages to check:
- requests < 2.31.0 (various CVEs)
- django < 4.2 (security patches)
- flask < 2.3.0 (various CVEs)
- pillow < 10.0.0 (various CVEs)
- pyyaml < 6.0 (arbitrary code execution)
- cryptography < 41.0.0 (various CVEs)
- urllib3 < 2.0.0 (various CVEs)
- paramiko < 3.0.0 (various CVEs)

Return ONLY raw JSON no markdown no backticks:
{
  "vulnerabilities": [
    {
      "package": "requests",
      "version": "2.18.0",
      "severity": "high",
      "cve": "CVE-2023-32681",
      "issue": "SSRF vulnerability",
      "safe_version": "2.31.0",
      "fix": "Upgrade to requests==2.31.0"
    }
  ],
  "score": 60,
  "risk_level": "high",
  "critical_count": 0,
  "high_count": 1,
  "total_packages_scanned": 5,
  "vulnerable_packages": 1,
  "summary": "one line summary"
}"""
        result = self.analyze(requirements, prompt)
        if "raw" in result:
            match = re.search(r'\{.*\}', result["raw"], re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except:
                    pass
        return result

