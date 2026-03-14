from agents.base_agent import BaseAgent

class LearningAgent(BaseAgent):
    def learn(self, code_diff: str) -> dict:
        prompt = """You are an expert with 20 years 
experience analyzing codebases.
Detect bad patterns in this code.
Return ONLY valid raw JSON (no markdown):
{
  "patterns_found": [
    {
      "pattern": "hardcoded_credentials",
      "severity": "critical",
      "confidence": 100,
      "description": "what the pattern is",
      "how_to_fix": "how to fix it",
      "example_fix": "fixed code example",
      "risk_level": "critical"
    }
  ],
  "score": 80,
  "summary": "one line summary",
  "risk_level": "critical"
}
Check for these patterns:
hardcoded_credentials, sql_injection,
missing_error_handling, long_function,
no_docstring, deep_nesting, 
magic_numbers, duplicate_code."""
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
