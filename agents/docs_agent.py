from agents.base_agent import BaseAgent

class DocsAgent(BaseAgent):
    def _coerce_raw_json(self, result: dict) -> dict:
        if "raw" not in result:
            return result
        import re, json, ast
        raw = result.get("raw", "")
        match = re.search(r'\{[\s\S]*\}', raw)
        if not match:
            return result
        candidate = match.group(0).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(candidate)
                return json.loads(json.dumps(parsed))
            except (ValueError, SyntaxError):
                normalized = re.sub(r"\bTrue\b", "true", candidate)
                normalized = re.sub(r"\bFalse\b", "false", normalized)
                normalized = re.sub(r"\bNone\b", "null", normalized)
                normalized = normalized.replace("'", '"')
                try:
                    return json.loads(normalized)
                except json.JSONDecodeError:
                    return result

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
        result = self._coerce_raw_json(self.analyze(code_diff, prompt))
        if isinstance(result, dict) and "score" in result and isinstance(result.get("issues", []), list):
            return result

        fallback_prompt = """You are a documentation expert.
Analyze this code and return ONLY strict JSON:
{
  "issues": [
    {
      "function": "name",
      "issue": "description",
      "confidence": 100,
      "fix": "how to fix"
    }
  ],
  "score": 0,
  "summary": "one line summary"
}
No markdown, no code fences, no extra text."""
        fallback = self._coerce_raw_json(self.analyze(code_diff, fallback_prompt))
        if isinstance(fallback, dict):
            return fallback
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
