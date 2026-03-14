import os, sys
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

from agents.code_review_agent import CodeReviewAgent
from agents.code_quality_agent import CodeQualityAgent
from agents.docs_agent import DocsAgent
from agents.learning_agent import LearningAgent
from agents.auto_fix_agent import AutoFixAgent

sample_code = """
def very_long_function_with_bad_name(data):
    password = "password123"
    if len(data) > 10:
        if 'special' in data:
            result = data['special'] * 5
            dangerous_value = result / 0
            return dangerous_value
    return None
"""

def print_divider(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def run_tests():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║       REPOGUARD AI - COMPLETE ANALYSIS REPORT          ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"\n📋 ORIGINAL CODE:\n{sample_code}")

    # Agent 1
    print_divider("🔍 AGENT 1: CODE REVIEW AGENT")
    r1 = CodeReviewAgent().review_and_fix(sample_code)
    issues = r1.get('issues', [])
    if issues:
        print("❌ ERRORS DETECTED:")
        for i, issue in enumerate(issues, 1):
            print(f"\n  {i}. Line {issue.get('line','?')} | "
                  f"SEVERITY: {str(issue.get('severity','?')).upper()} | "
                  f"CONFIDENCE: {issue.get('confidence','?')}%")
            print(f"     Issue : {issue.get('issue','?')}")
            print(f"     Impact: {issue.get('impact','?')}")
            print(f"     Fix   : {issue.get('fix','?')}")
    else:
        print("  ⚠️ No issues returned")
    print(f"\nSCORE: {r1.get('score', 0)}/100")
    if r1.get('fixed_code'):
        print(f"\n✅ FIXED CODE:\n{r1['fixed_code']}")
    if r1.get('changes_made'):
        print("\nCHANGES MADE:")
        for c in r1['changes_made']:
            print(f"  → {c}")

    # Agent 2
    print_divider("📊 AGENT 2: CODE QUALITY AGENT")
    r2 = CodeQualityAgent().analyze_and_fix(sample_code)
    issues2 = r2.get('issues', [])
    if issues2:
        print("❌ ISSUES DETECTED:")
        for i, issue in enumerate(issues2, 1):
            print(f"\n  {i}. TYPE: {issue.get('type','?')} | "
                  f"SEVERITY: {str(issue.get('severity','?')).upper()} | "
                  f"CONFIDENCE: {issue.get('confidence','?')}%")
            print(f"     Issue : {issue.get('issue','?')}")
            print(f"     Fix   : {issue.get('fix','?')}")
    else:
        print("  ⚠️ No issues returned - may be parsing error")
    print(f"\nSCORE: {r2.get('score', 0)}/100")

    # Agent 3
    print_divider("📝 AGENT 3: DOCUMENTATION AGENT")
    r3 = DocsAgent().check_and_fix(sample_code)
    issues3 = r3.get('issues', [])
    if issues3:
        print("❌ DOCUMENTATION ISSUES:")
        for i, issue in enumerate(issues3, 1):
            print(f"\n  {i}. FUNCTION: {issue.get('function','?')} | "
                  f"CONFIDENCE: {issue.get('confidence','?')}%")
            print(f"     Issue : {issue.get('issue','?')}")
            print(f"     Fix   : {issue.get('fix','?')}")
    else:
        print("  ⚠️ No issues returned")
    print(f"\nSCORE: {r3.get('score', 0)}/100")

    # Agent 4
    print_divider("🧠 AGENT 4: LEARNING AGENT")
    r4 = LearningAgent().learn(sample_code)
    patterns = r4.get('patterns_found', [])
    if patterns:
        print("PATTERNS DETECTED:")
        for p in patterns:
            print(f"\n  Pattern  : {p.get('pattern','?')}")
            print(f"  Severity : {p.get('severity','?').upper()}")
            print(f"  Confidence: {p.get('confidence','?')}%")
            print(f"  Description: {p.get('description','?')}")
            print(f"  Fix      : {p.get('how_to_fix','?')}")
            print(f"  Example  : {p.get('example_fix','?')}")
            print(f"  Risk     : {p.get('risk_level','?')}")
    else:
        print("  ⚠️ No patterns returned")
    print(f"\nSCORE: {r4.get('score', 0)}/100")

    # Auto Fix Agent
    print_divider("🤖 AUTO FIX AGENT - MASTER REPORT")
    auto = AutoFixAgent().full_review_and_fix(sample_code)
    
    print("\n┌─────────────────────────────────────────────┐")
    print("│          AGENT IMPROVEMENT SCORES          │")
    print("├──────────────────┬────────┬────────┬────────┤")
    print("│ Agent            │ Before │ After  │ Gain   │")
    print("├──────────────────┼────────┼────────┼────────┤")
    for imp in auto.get('agent_improvements', []):
        gain = imp['gain']
        gain_str = f"+{gain}" if gain >= 0 else str(gain)
        print(f"│ {imp['agent']:<16} │ "
              f"{imp['before']:>3}/100 │ "
              f"{imp['after']:>3}/100 │ "
              f"{gain_str:>6} │")
    print("├──────────────────┼────────┼────────┼────────┤")
    ob = auto.get('overall_before', 0)
    oa = auto.get('overall_after', 0)
    og = auto.get('total_improvement', 0)
    og_str = f"+{og}" if og >= 0 else str(og)
    print(f"│ {'OVERALL':<16} │ "
          f"{ob:>3}/100 │ "
          f"{oa:>3}/100 │ "
          f"{og_str:>6} │")
    print("└──────────────────┴────────┴────────┴────────┘")

    print(f"""
╔══════════════════════════════════════════════════╗
║           REPOGUARD AI FINAL REPORT             ║
╠══════════════════════════════════════════════════╣
║  BEFORE GRADE : {auto.get('grade_before','F')} ({auto.get('overall_before',0)}/100)
║  AFTER GRADE  : {auto.get('grade_after','F')} ({auto.get('overall_after',0)}/100)
║  IMPROVEMENT  : +{auto.get('total_improvement',0)} points 🚀
║  ISSUES FIXED : {auto.get('issues_fixed',0)}
╚══════════════════════════════════════════════════╝""")

    print(f"\n--- 🙈 ORIGINAL CODE ---\n{auto.get('original_code','')}")
    print(f"\n--- ✨ FIXED CODE ---\n{auto.get('fixed_code','')}")
    
    if auto.get('changes_made'):
        print("\nCHANGES MADE:")
        for i, change in enumerate(auto['changes_made'], 1):
            print(f"  {i}. ✅ {change}")

if __name__ == "__main__":
    run_tests()

from agents.github_auth import verify_token
from agents.security_agent import SecurityAgent
from agents.security_fix_agent import SecurityFixAgent


security_test_code = """
import os, subprocess, hashlib, pickle, random, requests

API_KEY = "sk-1234567890abcdef"
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
DB_PASSWORD = "admin123"
JWT_SECRET = "mysecretkey"

def login(username, password):
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"

def run_command(user_input):
    os.system(f"ls {user_input}")

def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()

def get_token():
    return str(random.randint(100000, 999999))

def load_data(user_data):
    return pickle.loads(user_data)

def fetch_url(url):
    return requests.get(url, verify=False)

def get_file(filename):
    with open(f"/var/data/{filename}") as f:
        return f.read()

def process(data):
    eval(data)
"""


def _print_security_findings(severity: str, vulnerabilities: list) -> None:
    print(f"\n{severity.upper()} ({len(vulnerabilities)})")
    if not vulnerabilities:
        print("  None")
        return
    for item in vulnerabilities:
        print(
            f"  Line {item.get('line', '?')} | OWASP: {item.get('owasp', 'N/A')} | "
            f"Confidence: {item.get('confidence', '?')}% | CVE: {item.get('cve') or 'None'}"
        )
        print(f"  Issue: {item.get('issue', 'Unknown issue')}")
        print(f"  Fix: {item.get('fix', 'No fix provided')}")


def _run_security_demo() -> None:
    print("="*80)
    print("🛡️  REPOGUARD AI — DEEP SECURITY SCAN")
    print("="*80)

    security_agent = SecurityAgent()
    deep_scan_result = security_agent.deep_scan(security_test_code)
    vulnerabilities = deep_scan_result.get("vulnerabilities", [])

    if deep_scan_result.get("error"):
        print(f"Security scan error: {deep_scan_result['error']}")

    for severity in ("critical", "high", "medium", "low"):
        grouped = [
            item for item in vulnerabilities
            if str(item.get("severity", "")).lower() == severity
        ]
        _print_security_findings(severity, grouped)

    owasp_result = security_agent.check_owasp(security_test_code)
    if owasp_result.get("error"):
        print(f"\nOWASP scan error: {owasp_result['error']}")
    else:
        print("\nOWASP TOP 10 2021")
        for item in owasp_result.get("owasp_results", []):
            status = str(item.get("status", "NEEDS_REVIEW")).upper()
            icon = "✅" if status == "CLEAR" else "❌"
            print(
                f"{icon} {item.get('id', 'A00')} {item.get('name', 'Unknown')}: "
                f"{status} - {item.get('details', 'No details provided')}"
            )

    print(f"\nSecurity Score: {deep_scan_result.get('security_score', 0)}/100")
    print(f"Risk Level: {deep_scan_result.get('risk_level', 'unknown')}")
    print(f"Block Deployment: {deep_scan_result.get('block_deployment', False)}")

    print("="*80)
    print("🔧 SECURITY AUTO FIX APPLIED")
    print("="*80)

    security_fix_result = SecurityFixAgent().fix_all_security(security_test_code, vulnerabilities)
    if security_fix_result.get("error"):
        print(f"Security fix error: {security_fix_result['error']}")
    for fix in security_fix_result.get("fixes_applied", []):
        print(
            f"{fix.get('line_before', '')} ❌ -> {fix.get('line_after', '')} ✅"
        )
        print(f"Explanation: {fix.get('explanation', 'No explanation provided')}")

    print(
        f"Score Before/After: {security_fix_result.get('security_score_before', 0)}/100 -> "
        f"{security_fix_result.get('security_score_after', 0)}/100"
    )
    print(f"Certification: {security_fix_result.get('security_certification', 'NEEDS_REVIEW')}")
    print(f"Deployment Safe: {security_fix_result.get('deployment_safe', False)}")

    print("="*80)
    print("🔗 PRIVATE REPOSITORY SUPPORT")
    print("="*80)

    token_result = verify_token()
    is_valid = token_result.get("valid", False)
    print(f"GitHub Token: {'valid' if is_valid else 'invalid'}")
    print(f"Token Owner: {token_result.get('user', 'unknown')}")
    print(f"Private Access Enabled: {'Yes' if is_valid else 'No'}")


if __name__ == "__main__":
    _run_security_demo()

