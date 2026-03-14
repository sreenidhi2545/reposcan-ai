from agents.base_agent import BaseAgent

class CodeQualityAgent(BaseAgent):
    def analyze(self, code_diff: str) -> dict:
        prompt = """You are a code quality expert. Analyze this code diff carefully.
Check for:
- Cyclomatic complexity
- Code smells
- Naming conventions
- Duplicate code blocks
- Maintainability
Return ONLY this JSON structure:
{
  "issues": [{"type": str, "severity": "low/medium/high", "issue": str, "fix": str}],
  "score": int between 0-100,
  "summary": str
}"""
        return super().analyze(code_diff, prompt)
