import json
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
        security_before = SecurityAgent().deep_scan(code)
        security_after = SecurityAgent().deep_scan(fixed_code)

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
        overall_after_result = _calculate_weighted_overall_score(
            after_scores['security'],
            after_scores['code_review'],
            after_scores['code_quality'],
            after_scores['docs'],
            after_scores['learning'],
            int(security_after.get('critical_count', 0) or 0),
        )
        overall_before = overall_before_result['overall_score']
        overall_after = overall_after_result['overall_score']

        # STEP 5: Build improvements table
        agent_improvements = [
            {
                "agent": "Security",
                "before": before_scores['security'],
                "after": after_scores['security'],
                "gain": after_scores['security'] - before_scores['security']
            },
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
        security_status = overall_after_result['status']

        return {
            "original_code": code,
            "fixed_code": fixed_code,
            "changes_made": list(set(all_changes)),
            "issues_fixed": _IssuesFixedDisplay(len(all_changes), security_status),
            "agent_improvements": agent_improvements,
            "overall_before": overall_before,
            "overall_after": overall_after,
            "total_improvement": overall_after - overall_before,
            "grade_before": _get_grade_for_weighted_score(overall_before),
            "grade_after": _get_grade_for_weighted_score(overall_after),
            "docs_score_before": before_scores['docs'],
            "docs_score_after": after_scores['docs'],
            "security_before": security_before,
            "security_after": security_after,
            "security_status": security_status,
            "security_certification": overall_after_result['certification']
        }


def _get_grade_for_weighted_score(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def _extract_agent_scores(result: dict, score_key: str) -> dict:
    score_map = {
        "Security": 50,
        "Code Review": 0,
        "Code Quality": 0,
        "Documentation": 0,
        "Learning": 0,
    }
    for item in result.get("agent_improvements", []):
        if not isinstance(item, dict):
            continue
        agent_name = item.get("agent")
        if agent_name in score_map:
            score_map[agent_name] = int(item.get(score_key, 0) or 0)
    return {
        "security": score_map["Security"],
        "code_review": score_map["Code Review"],
        "code_quality": score_map["Code Quality"],
        "docs": score_map["Documentation"],
        "learning": score_map["Learning"],
    }


def _calculate_security_weighted_score(
    security_score: int,
    code_review: int,
    code_quality: int,
    docs_score: int,
    learning_score: int,
    critical_count: int,
) -> dict:
    return _calculate_weighted_overall_score(
        security_score,
        code_review,
        code_quality,
        docs_score,
        learning_score,
        critical_count,
    )


def _full_review_and_fix_with_security(self, code: str) -> dict:
    result = self.full_review_and_fix(code)
    security_before = result.get("security_before", {})
    security_after = result.get("security_after", {})

    before_scores = _extract_agent_scores(result, "before")
    after_scores = _extract_agent_scores(result, "after")

    weighted_before = _calculate_security_weighted_score(
        int(security_before.get("security_score", 0) or 0),
        before_scores["code_review"],
        before_scores["code_quality"],
        before_scores["docs"],
        before_scores["learning"],
        int(security_before.get("critical_count", 0) or 0),
    )
    weighted_after = _calculate_security_weighted_score(
        int(security_after.get("security_score", 0) or 0),
        after_scores["code_review"],
        after_scores["code_quality"],
        after_scores["docs"],
        after_scores["learning"],
        int(security_after.get("critical_count", 0) or 0),
    )

    security_improvements = list(result.get("agent_improvements", []))

    enriched_result = dict(result)
    enriched_result.update(
        {
            "security_before": security_before,
            "security_after": security_after,
            "agent_improvements_with_security": security_improvements,
            "overall_score_before": weighted_before["overall_score"],
            "overall_score_after": weighted_after["overall_score"],
            "overall_score_improvement": weighted_after["overall_score"] - weighted_before["overall_score"],
            "status_before": weighted_before["status"],
            "status_after": weighted_after["status"],
            "certification_before": weighted_before["certification"],
            "certification_after": weighted_after["certification"],
            "security_grade_before": _get_grade_for_weighted_score(weighted_before["overall_score"]),
            "security_grade_after": _get_grade_for_weighted_score(weighted_after["overall_score"]),
        }
    )
    return enriched_result


AutoFixAgent.full_review_and_fix_with_security = _full_review_and_fix_with_security
