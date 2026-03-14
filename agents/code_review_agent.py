from .base_agent import BaseAgent

class CodeReviewAgent(BaseAgent):
    def review(self, code_diff: str) -> dict:
        prompt = """You are a senior code reviewer. Analyze this code diff carefully.
Return ONLY raw JSON (no markdown, no explanation) with these exact fields:
{
  'issues': [{'line': int, 'severity': 'low/medium/high', 'issue': str, 'fix': str}],
  'score': int between 0-100,
  'summary': str
}"""
        return self.analyze(code_diff, prompt)
