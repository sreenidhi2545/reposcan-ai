import asyncio
import json
from .base_agent import BaseAgent
from .code_review_agent import CodeReviewAgent
from .code_quality_agent import CodeQualityAgent
from .docs_agent import DocsAgent

class AutoFixAgent(BaseAgent):
    async def full_review_and_fix(self, code: str) -> dict:
        review_agent = CodeReviewAgent()
        quality_agent = CodeQualityAgent()
        docs_agent = DocsAgent()

        # Run detection agents concurrently
        detection_results = await asyncio.gather(
            asyncio.to_thread(review_agent.review, code),
            asyncio.to_thread(quality_agent.analyze, code),
            asyncio.to_thread(docs_agent.check, code)
        )

        review_result, quality_result, docs_result = detection_results

        all_issues = []
        if "issues" in review_result:
            all_issues.extend(review_result["issues"])
        if "issues" in quality_result:
            all_issues.extend(quality_result["issues"])
        if "issues" in docs_result:
            all_issues.extend(docs_result["issues"])
            
        before_score = int(
            (review_result.get("score", 0) * 0.4) + 
            (quality_result.get("score", 0) * 0.4) + 
            (docs_result.get("score", 0) * 0.2)
        )

        prompt = """You are a world class software engineer. Fix this code by:
1. Adding proper docstrings to all functions
2. Removing hardcoded passwords/credentials
3. Adding proper error handling with try/except
4. Fixing any logic errors
5. Improving variable/function naming
6. Reducing complexity
Return ONLY raw JSON:
{
    'original_code': str,
    'fixed_code': str,
    'total_issues_fixed': int,
    'changes': [{'issue': str, 'fix_applied': str}],
    'before_score': int,
    'after_score': int,
    'improvement': str
}"""
        
        issues_str = json.dumps(all_issues, indent=2)
        content = f"Original Code:\n```python\n{code}\n```\n\nIssues Found:\n{issues_str}\n\nBefore Score: {before_score}"
        
        # Use the base analyze method for a custom prompt
        fix_result = self.analyze(content, prompt)
        
        # Add original data to the final result
        if isinstance(fix_result, dict):
            fix_result['original_code'] = code
            fix_result['before_score'] = before_score
            if 'after_score' in fix_result and 'before_score' in fix_result:
                improvement = fix_result['after_score'] - fix_result['before_score']
                fix_result['improvement'] = f"+{improvement} points"

        return fix_result
