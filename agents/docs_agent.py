from .base_agent import BaseAgent

class DocsAgent(BaseAgent):
    async def check(self, code_diff: str) -> dict:
        prompt = """You are a documentation expert. Analyze this code for documentation issues.
Return ONLY raw JSON (no markdown, no explanation) with these exact fields:
{
  'issues': [{'function': str, 'issue': str, 'fix': str}],
  'score': int between 0-100,
  'summary': str
}

Check for:
- missing docstrings
- missing parameter docs
- missing return type hints"""
        return await self.analyze(code_diff, prompt)

    async def check_and_fix(self, code_diff: str) -> tuple[dict, str]:
        issues = await self.check(code_diff)
        fixed_code = await self.fix(code_diff, issues.get("issues", []))
        return issues, fixed_code
