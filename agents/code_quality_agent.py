from agents.base_agent import BaseAgent
import re
import json

class CodeQualityAgent(BaseAgent):
    async def analyze(self, code_diff: str) -> dict:
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
        result = await super().analyze(code_diff, prompt)
        if "raw" in result:
            json_match = re.search(r'```json\n(.*?)\n```', result["raw"], re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    # If parsing fails, return the raw content to avoid crashing
                    pass
        return result

    async def analyze_and_fix(self, code_diff: str) -> tuple[dict, str]:
        analysis_result = await self.analyze(code_diff)
        issues = analysis_result.get("issues", [])
        fixed_code = await self.fix(code_diff, issues)
        return analysis_result, fixed_code
