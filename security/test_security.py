import os, sys
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

from security.security_agent import SecurityAgent
from security.dependency_agent import DependencyAgent
from security.security_fix_agent import SecurityFixAgent

security_test_code = """
import os
import subprocess
import hashlib
import pickle
import random
import requests

API_KEY = "sk-1234567890abcdef"
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"
DB_PASSWORD = "admin123"

def login(username, password):
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    return query

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
"""

test_requirements = """
requests==2.18.0
django==3.2.0
pillow==9.0.0
pyyaml==5.3.0
flask==1.0.0
"""

def run_security_tests():
    print("╔══════════════════════════════════════════════════════════╗")
    print("║      REPOGUARD AI - SECURITY ANALYSIS REPORT           ║")
    print("╚══════════════════════════════════════════════════════════╝")

    print("\n📋 TEST CODE CONTAINS:")
    print("  - 3 hardcoded credentials (API key, AWS key, password)")
    print("  - 1 SQL injection vulnerability")
    print("  - 1 command injection (os.system)")
    print("  - 1 weak hashing (MD5)")
    print("  - 1 insecure random token")
    print("  - 1 unsafe deserialization (pickle)")
    print("  - 1 SSL verification disabled")
    print("  - 1 path traversal risk")

    print("\n" + "="*70)
    print("  🛡️  DEEP SECURITY SCAN")
    print("="*70)

    security_agent = SecurityAgent()
    scan_result = security_agent.deep_scan(security_test_code)

    vulns = scan_result.get('vulnerabilities', [])
    critical = [v for v in vulns if v.get('severity') == 'critical']
    high     = [v for v in vulns if v.get('severity') == 'high']
    medium   = [v for v in vulns if v.get('severity') == 'medium']
    low      = [v for v in vulns if v.get('severity') == 'low']

    if critical:
        print("\n🔴 CRITICAL VULNERABILITIES (Block Deployment):")
        print("─" * 60)
        for i, v in enumerate(critical, 1):
            print(f"\n{i}. Line {v.get('line','?')} | "
                  f"OWASP: {v.get('owasp','?')} | "
                  f"CONFIDENCE: {v.get('confidence','?')}%")
            print(f"   ❌ Issue  : {v.get('issue','?')}")
            print(f"   💥 Impact : {v.get('impact','?')}")
            print(f"   🔧 Fix    : {v.get('fix','?')}")
            print(f"   📋 CVE    : {v.get('cve','N/A')}")

    if high:
        print("\n🟠 HIGH VULNERABILITIES:")
        print("─" * 60)
        for i, v in enumerate(high, 1):
            print(f"\n{i}. Line {v.get('line','?')} | "
                  f"OWASP: {v.get('owasp','?')} | "
                  f"CONFIDENCE: {v.get('confidence','?')}%")
            print(f"   ❌ Issue  : {v.get('issue','?')}")
            print(f"   💥 Impact : {v.get('impact','?')}")
            print(f"   🔧 Fix    : {v.get('fix','?')}")

    if medium:
        print("\n🟡 MEDIUM VULNERABILITIES:")
        print("─" * 60)
        for i, v in enumerate(medium, 1):
            print(f"\n{i}. Line {v.get('line','?')} | "
                  f"CONFIDENCE: {v.get('confidence','?')}%")
            print(f"   ❌ Issue  : {v.get('issue','?')}")
            print(f"   🔧 Fix    : {v.get('fix','?')}")

    print(f"\n{'─'*60}")
    print(f"  Critical : {len(critical)}  🔴")
    print(f"  High     : {len(high)}  🟠")
    print(f"  Medium   : {len(medium)}  🟡")
    print(f"  Low      : {len(low)}  🟢")
    print(f"\n  SECURITY SCORE   : {scan_result.get('security_score', 0)}/100  🔴")
    print(f"  RISK LEVEL       : {scan_result.get('risk_level','?').upper()}")
    print(f"  BLOCK DEPLOYMENT : {'YES ❌' if scan_result.get('block_deployment') else 'NO ✅'}")

    print("\n" + "="*70)
    print("  📋 OWASP TOP 10 CHECK")
    print("="*70)

    owasp_result = security_agent.check_owasp(security_test_code)
    owasp_results = owasp_result.get('owasp_results', [])

    for item in owasp_results:
        status = item.get('status', 'UNKNOWN')
        icon = "❌" if status == "VIOLATED" else "✅" if status == "CLEAR" else "⚠️"
        print(f"  {icon} {item.get('id','?')} - "
              f"{item.get('name','?'):<35} : {status}")

    print(f"\n  OWASP VIOLATIONS : {owasp_result.get('total_violations', 0)}/10")
    print(f"  OWASP SCORE      : {owasp_result.get('owasp_score', 0)}/100")
    print(f"  CERTIFICATION    : {owasp_result.get('certification', 'FAIL')}")

    print("\n" + "="*70)
    print("  📦 DEPENDENCY VULNERABILITY SCAN")
    print("="*70)

    dep_agent = DependencyAgent()
    dep_result = dep_agent.scan(test_requirements)
    dep_vulns = dep_result.get('vulnerabilities', [])

    if dep_vulns:
        print(f"\n  Vulnerable packages found: {len(dep_vulns)}")
        print("─" * 60)
        for v in dep_vulns:
            sev = v.get('severity','?').upper()
            icon = "🔴" if sev == "CRITICAL" else \
                   "🟠" if sev == "HIGH" else \
                   "🟡" if sev == "MEDIUM" else "🟢"
            print(f"\n  {icon} {v.get('package','?')} v{v.get('version','?')}")
            print(f"     CVE   : {v.get('cve','N/A')}")
            print(f"     Issue : {v.get('issue','?')}")
            print(f"     Fix   : {v.get('fix','?')}")
    else:
        print("  ✅ No vulnerable dependencies found")

    print(f"\n  DEPENDENCY SCORE : {dep_result.get('score', 0)}/100")
    print(f"  PACKAGES SCANNED : {dep_result.get('total_packages_scanned', 0)}")
    print(f"  VULNERABLE       : {dep_result.get('vulnerable_packages', 0)}")

    print("\n" + "="*70)
    print("  🔧 SECURITY AUTO FIX")
    print("="*70)

    fix_agent = SecurityFixAgent()
    fix_result = fix_agent.fix_security(security_test_code, vulns[:5])
    fixes = fix_result.get('fixes_applied', [])

    if fixes:
        print(f"\n  Fixes Applied ({len(fixes)} total):")
        print("─" * 60)
        for i, fix in enumerate(fixes, 1):
            sev = fix.get('severity','?').upper()
            print(f"\n  {i}. [{sev}] {fix.get('vulnerability','?')}")
            print(f"     ❌ Before: {fix.get('line_before','?')}")
            print(f"     ✅ After : {fix.get('line_after','?')}")
            print(f"     📝 Why   : {fix.get('explanation','?')}")

    print(f"\n  SECURITY SCORE BEFORE : {fix_result.get('security_score_before', 0)}/100  🔴")
    print(f"  SECURITY SCORE AFTER  : {fix_result.get('security_score_after', 0)}/100  🟢")
    print(f"  CERTIFICATION         : {fix_result.get('security_certification','?')} ✅")
    print(f"  DEPLOYMENT SAFE       : {'YES ✅' if fix_result.get('deployment_safe') else 'NO ❌'}")

    if fix_result.get('fixed_code'):
        print(f"\n  ✅ FIXED CODE:")
        print("─" * 60)
        print(fix_result['fixed_code'])

    total_vulns = len(vulns)
    total_critical = len(critical)
    owasp_violations = owasp_result.get('total_violations', 0)
    dep_vulnerable = dep_result.get('vulnerable_packages', 0)
    score_before = scan_result.get('security_score', 0)
    score_after = fix_result.get('security_score_after', 0)
    deployment_safe = fix_result.get('deployment_safe', False)
    deployment_safe_text = 'YES ✅' if deployment_safe else 'NO ❌'

    print(f"""
╔══════════════════════════════════════════════════════════╗
║              SECURITY FINAL SUMMARY                     ║
╠══════════════════════════════════════════════════════════╣
║  Vulnerabilities Found : {total_vulns:<4}                        ║
║  Critical Issues       : {total_critical:<4}  🔴                   ║
║  OWASP Violations      : {owasp_violations:<4}/10                    ║
║  Vulnerable Packages   : {dep_vulnerable:<4}                        ║
║  Security Score Before : {score_before:<4}/100  🔴               ║
║  Security Score After  : {score_after:<4}/100  🟢               ║
║  Deployment Safe After : {deployment_safe_text:<29}║
╚══════════════════════════════════════════════════════════╝""")

if __name__ == "__main__":
    run_security_tests()
