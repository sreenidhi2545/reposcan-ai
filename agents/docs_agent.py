from .base_agent import BaseAgent

class DocsAgent(BaseAgent):
    def check(self, code_diff: str) -> dict:
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
        return self.analyze(code_diff, prompt)
