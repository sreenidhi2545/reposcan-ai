import json
from agents.code_review_agent import CodeReviewAgent
from agents.code_quality_agent import CodeQualityAgent
from agents.docs_agent import DocsAgent
from agents.learning_agent import LearningAgent
from agents.base_agent import BaseAgent

class AutoFixAgent(BaseAgent):
    def full_review_and_fix(self, code: str) -> dict:
        
        # STEP 1: Run all agents to get before/after scores and fixes
        review_result = CodeReviewAgent().review_and_fix(code)
        quality_result = CodeQualityAgent().analyze_and_fix(code)
        docs_result = DocsAgent().check_and_fix(code)
        learning_result = LearningAgent().learn(code) # Learning agent only analyzes

        # STEP 2: Aggregate all issues and changes
        all_issues = []
        all_changes = []
        if 'issues' in review_result: all_issues.extend(review_result['issues'])
        if 'issues' in quality_result: all_issues.extend(quality_result['issues'])
        if 'issues' in docs_result: all_issues.extend(docs_result['issues'])
        if 'patterns_found' in learning_result: all_issues.extend(learning_result['patterns_found'])
        
        if 'changes_made' in review_result: all_changes.extend(review_result['changes_made'])
        if 'changes_made' in quality_result: all_changes.extend(quality_result['changes_made'])
        if 'changes_made' in docs_result: all_changes.extend(docs_result['changes_made'])

        # STEP 3: Use the fixed code from the agent with the most changes, assuming it's the most comprehensive
        # A more sophisticated approach could be to merge fixes, but this is simpler for now.
        fixed_code = review_result.get('fixed_code', code)
        if len(quality_result.get('changes_made', [])) > len(review_result.get('changes_made', [])):
            fixed_code = quality_result.get('fixed_code', code)
        if len(docs_result.get('changes_made', [])) > len(quality_result.get('changes_made', [])):
            fixed_code = docs_result.get('fixed_code', code)

        # STEP 4: Recalculate scores on the final fixed code
        review_after = CodeReviewAgent().review(fixed_code)
        quality_after = CodeQualityAgent().analyze(fixed_code)
        docs_after = DocsAgent().check(fixed_code)
        learning_after = LearningAgent().learn(fixed_code)

        before_scores = {
            'code_review': review_result.get('score', 0),
            'code_quality': quality_result.get('score', 0),
            'docs': docs_result.get('score', 0),
            'learning': learning_result.get('score', 0),
        }

        after_scores = {
            'code_review': review_after.get('score', 0),
            'code_quality': quality_after.get('score', 0),
            'docs': docs_after.get('score', 0),
            'learning': learning_after.get('score', 0),
        }

        overall_before = int(sum(before_scores.values()) / len(before_scores))
        overall_after = int(sum(after_scores.values()) / len(after_scores))

        # STEP 5: Build improvements table
        agent_improvements = [
            {
                "agent": "Code Review",
                "before": before_scores['code_review'],
                "after": after_scores['code_review'],
                "gain": after_scores['code_review'] - before_scores['code_review']
            },
            {
                "agent": "Code Quality",
                "before": before_scores['code_quality'],
                "after": after_scores['code_quality'],
                "gain": after_scores['code_quality'] - before_scores['code_quality']
            },
            {
                "agent": "Documentation",
                "before": before_scores['docs'],
                "after": after_scores['docs'],
                "gain": after_scores['docs'] - before_scores['docs']
            },
            {
                "agent": "Learning",
                "before": before_scores['learning'],
                "after": after_scores['learning'],
                "gain": after_scores['learning'] - before_scores['learning']
            }
        ]

        def get_grade(score):
            if score >= 90: return "A"
            if score >= 80: return "B"
            if score >= 70: return "C"
            if score >= 60: return "D"
            return "F"

        return {
            "original_code": code,
            "fixed_code": fixed_code,
            "changes_made": list(set(all_changes)),
            "issues_fixed": len(all_changes),
            "agent_improvements": agent_improvements,
            "overall_before": overall_before,
            "overall_after": overall_after,
            "total_improvement": overall_after - overall_before,
            "grade_before": get_grade(overall_before),
            "grade_after": get_grade(overall_after)
        }
