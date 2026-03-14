from agents.base_agent import BaseAgent

class CodeQualityAgent(BaseAgent):
    def analyze(self, code_diff: str) -> dict:
        prompt = """You are a code quality expert.
Analyze this code for quality issues.
Return ONLY valid raw JSON (no markdown):
{
  "issues": [
    {
      "type": "Code Smell",
      "severity": "high",
      "confidence": 90,
      "issue": "description",
      "impact": "what breaks",
      "fix": "how to fix"
    }
  ],
  "score": 20,
  "summary": "one line summary"
}
Check for: cyclomatic complexity, code smells,
naming conventions, duplicate code, 
maintainability, function length."""
        result = super().analyze(code_diff, prompt)
        if "raw" in result:
            import re, json
            match = re.search(
                r'\{.*\}', result["raw"], re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                except:
                    pass
        return result

    def analyze_and_fix(self, code_diff: str) -> dict:
        analysis = self.analyze(code_diff)
        issues = analysis.get("issues", [])
        fixed_code = self.fix(code_diff, issues)
        return {
            "issues": issues,
            "score": analysis.get("score", 0),
            "summary": analysis.get("summary", ""),
            "fixed_code": fixed_code,
            "changes_made": [
                f"Fixed: {i.get('issue','')}" 
                for i in issues
            ]
        }
