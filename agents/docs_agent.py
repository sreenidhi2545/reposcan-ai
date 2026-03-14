from agents.base_agent import BaseAgent

class DocsAgent(BaseAgent):
    def check(self, code_diff: str) -> dict:
        prompt = """You are a documentation expert.
Analyze this code for documentation issues.
Return ONLY valid raw JSON (no markdown):
{
  "issues": [
    {
      "function": "function_name",
      "issue": "missing docstring",
      "confidence": 100,
      "fix": "add docstring",
      "example": "example docstring"
    }
  ],
  "score": 0,
  "summary": "one line summary"
}
Check for: missing docstrings, missing 
parameter docs, missing return type hints,
missing inline comments."""
        result = self.analyze(code_diff, prompt)
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

    def check_and_fix(self, code_diff: str) -> dict:
        check_result = self.check(code_diff)
        issues = check_result.get("issues", [])
        fixed_code = self.fix(code_diff, issues)
        return {
            "issues": issues,
            "score": check_result.get("score", 0),
            "summary": check_result.get("summary", ""),
            "fixed_code": fixed_code,
            "changes_made": [
                f"Fixed: {i.get('issue','')}" 
                for i in issues
            ]
        }
