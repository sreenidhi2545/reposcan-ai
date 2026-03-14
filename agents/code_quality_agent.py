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
        result = super().analyze(code_diff, prompt)
        if "raw" in result:
            import re
            import json
            json_match = re.search(r'```json\n(.*?)\n```', result["raw"], re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    # If parsing fails, return the raw content to avoid crashing
                    pass
        return result

    def analyze_and_fix(self, code_diff: str) -> dict:
        analysis_result = self.analyze(code_diff)
        if "issues" in analysis_result:
            fix_result = self.fix(code_diff, analysis_result["issues"])
            analysis_result.update(fix_result)
        return analysis_result
