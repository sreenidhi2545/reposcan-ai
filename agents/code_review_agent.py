from .base_agent import BaseAgent

class CodeReviewAgent(BaseAgent):
    async def review(self, code_diff: str) -> dict:
        prompt = """You are a senior code reviewer. Analyze this code diff carefully.
Return ONLY raw JSON (no markdown, no explanation) with these exact fields:
{
  'issues': [{'line': int, 'severity': 'low/medium/high', 'issue': str, 'fix': str}],
  'score': int between 0-100,
  'summary': str
}"""
        return await self.analyze(code_diff, prompt)

    async def review_and_fix(self, code_diff: str) -> tuple[dict, str]:
        issues = await self.review(code_diff)
        fixed_code = await self.fix(code_diff, issues.get("issues", []))
        return issues, fixed_code
