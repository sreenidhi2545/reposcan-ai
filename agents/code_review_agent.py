from agents.base_agent import BaseAgent

class CodeReviewAgent(BaseAgent):
    def review(self, code_diff: str) -> dict:
        prompt = """You are a senior code reviewer.
Analyze this code diff carefully.
IMPORTANT: For each issue, the 'file' field must contain the exact file path as it appears after 'FILE:' in the code content provided. Never use 'unknown' as the file value.
Return ONLY valid raw JSON (no markdown):
{
  "issues": [
    {
      "file": "actual/path/to/file.py",
      "line": 1,
      "severity": "high",
      "confidence": 95,
      "issue": "description",
      "impact": "what breaks",
      "fix": "how to fix",
      "example": "fixed code example"
    }
  ],
  "score": 20,
  "summary": "one line summary"
}
Check for: bad naming, long functions, 
deep nesting, missing error handling, 
duplicate code, hardcoded values."""
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

    def review_and_fix(self, code_diff: str) -> dict:
        review_result = self.review(code_diff)
        issues = review_result.get("issues", [])
        fixed_code = self.fix(code_diff, issues)
        changes = review_result.get("changes_made", [
            f"Fixed: {i.get('issue','')}" 
            for i in issues
        ])
        return {
            "issues": issues,
            "score": review_result.get("score", 0),
            "summary": review_result.get("summary", ""),
            "fixed_code": fixed_code,
            "changes_made": changes
        }
