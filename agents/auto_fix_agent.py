import asyncio
from .base_agent import BaseAgent
from .code_review_agent import CodeReviewAgent
from .code_quality_agent import CodeQualityAgent
from .docs_agent import DocsAgent

class AutoFixAgent(BaseAgent):
    async def full_review_and_fix(self, code: str) -> str:
        review_agent = CodeReviewAgent()
        quality_agent = CodeQualityAgent()
        docs_agent = DocsAgent()

        # Run detection agents concurrently
        review_result, quality_result, docs_result = await asyncio.gather(
            review_agent.review(code),
            quality_agent.analyze(code),
            docs_agent.check(code)
        )

        all_issues = []
        if "issues" in review_result:
            all_issues.extend(review_result["issues"])
        if "issues" in quality_result:
            all_issues.extend(quality_result["issues"])
        if "issues" in docs_result:
            all_issues.extend(docs_result["issues"])
            
        if not all_issues:
            return code

        # Use the base fix method for a comprehensive fix
        fixed_code = await self.fix(code, all_issues)
        return fixed_code
