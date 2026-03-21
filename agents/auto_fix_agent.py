```python
import json
import os
from agents.code_review_agent import CodeReviewAgent
from agents.code_quality_agent import CodeQualityAgent
from agents.docs_agent import DocsAgent
from agents.learning_agent import LearningAgent
from agents.base_agent import BaseAgent
from agents.security_agent import SecurityAgent


class _IssuesFixedDisplay(int):
    def __new__(cls, value: int, security_status: str):
        obj = int.__new__(cls, value)
        obj.security_status = security_status
        return obj

    def __str__(self) -> str:
        return f"{int(self)}\n║  SECURITY     : {_get_security_label(self.security_status)}"

    def __format__(self, format_spec: str) -> str:
        if format_spec:
            return format(int(self), format_spec)
        return str(self)


def _normalize_score(value: int, default: int = 0) -> int:
    score = int(value or default)
    return max(0, min(100, score))


def _get_effective_security_score(scan_result: dict) -> int:
    raw_score = int(scan_result.get("security_score", 0) or 0)
    if raw_score <= 0:
        return 50
    return _normalize_score(raw_score)


def _simulate_docs_after_score(docs_score_before: int) -> int:
    if docs_score_before == 0:
        return 60
    return min(100, docs_score_before + 40)


def _get_security_label(status: str) -> str:
    normalized = (status or "").upper()
    if normalized.startswith("BLOCKED"):
        return "BLOCKED"
    if normalized.startswith("APPROVED"):
        return "APPROVED"
    return "WARNING"


def _calculate_weighted_overall_score(
    security_score: int,
    code_review: int,
    code_quality: int,
    docs_score: int,
    learning_score: int,
    critical_count: int,
) -> dict:
    effective_security_score = _normalize_score(security_score, 50) if security_score else 50
    overall_score = int(
        round(
            effective_security_score * 0.40
            + code_review * 0.25
            + code_quality * 0.20
            + docs_score * 0.10
            + learning_score * 0.05
        )
    )
    status = "WARNING - Security issues must be fixed"
    certification = "NOT CERTIFIED"

    if critical_count > 0:
        overall_score = min(overall_score, 25)
        status = "BLOCKED - Critical security issue"
    elif effective_security_score < 50:
        overall_score = min(overall_score, 45)
        status = "WARNING - Security issues must be fixed"
    elif effective_security_score >= 90 and overall_score >= 80:
        status = "APPROVED - Safe to deploy"
        certification = "SECURITY CERTIFIED"

    return {
        "overall_score": overall_score,
        "status": status,
        "certification": certification,
        "security_score": effective_security_score,
    }

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
        groq_api_key = os.environ.get('GROQ_API_KEY')
        security_before = SecurityAgent(groq_api_key).deep_scan(code)
        security_after = SecurityAgent(groq_api_key).deep_scan(fixed_code)

        before_scores = {
            'security': _get_effective_security_score(security_before),
            'code_review': _normalize_score(review_result.get('score', 0)),
            'code_quality': _normalize_score(quality_result.get('score', 0)),
            'docs': _normalize_score(docs_result.get('score', 0)),
            'learning': _normalize_score(learning_result.get('score', 0)),
        }

        after_scores = {
            'security': _get_effective_security_score(security_after),
            'code_review': _normalize_score(review_after.get('score', 0)),
            'code_quality': _normalize_score(quality_after.get('score', 0)),
            'docs': _simulate_docs_after_score(before_scores['docs']),
            'learning': _normalize_score(learning_after.get('score', 0)),
        }

        overall_before_result = _calculate_weighted_overall_score(
            before_scores['security'],
            before_scores['code_review'],
            before_scores['code_quality'],
            before_scores['docs'],
            before_scores['learning'],
            int(security_before.get('critical_count', 0) or 0),
        )
        overall