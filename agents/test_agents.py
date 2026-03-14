import os
import sys
import asyncio

# This is needed to run tests from the root directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from agents.code_review_agent import CodeReviewAgent
from agents.code_quality_agent import CodeQualityAgent
from agents.docs_agent import DocsAgent
from agents.auto_fix_agent import AutoFixAgent

# Sample bad code with multiple issues
sample_code_diff = """
def very_long_function_with_bad_name(data):
    # This function is way too long and does too many things.
    # It also has a hardcoded password.
    password = "password123" 
    if len(data) > 10:
        if 'special' in data:
            # Deeply nested condition
            result = data['special'] * 5
            # No error handling for this risky operation
            dangerous_value = result / 0
            return dangerous_value
    # ... imagine more lines to make it long
    return None
"""

def print_header(title):
    """Prints a formatted header."""
    print("\n" + "="*80)
    print(f"🚀 {title}")
    print("="*80)

def print_before_after(original, fixed):
    """Prints a side-by-side comparison of before and after code."""
    print("\n--- 🙈 BEFORE ---")
    print(original)
    print("\n--- ✨ AFTER ---")
    print(fixed)
    print("-" * 80)

async def run_tests():
    """Initializes and runs all agents on the sample code."""
    # Ensure you have a .env file with GROQ_API_KEY in the root
    
    print_header("Running Code Review Agent")
    review_agent = CodeReviewAgent()
    review_issues, fixed_code_review = await review_agent.review_and_fix(sample_code_diff)
    print("Detected Issues:", review_issues)
    print_before_after(sample_code_diff, fixed_code_review)

    print_header("Running Code Quality Agent")
    quality_agent = CodeQualityAgent()
    quality_issues, fixed_code_quality = await quality_agent.analyze_and_fix(sample_code_diff)
    print("Detected Issues:", quality_issues)
    print_before_after(sample_code_diff, fixed_code_quality)

    print_header("Running Docs Agent")
    docs_agent = DocsAgent()
    docs_issues, fixed_code_docs = await docs_agent.check_and_fix(sample_code_diff)
    print("Detected Issues:", docs_issues)
    print_before_after(sample_code_diff, fixed_code_docs)

    print_header("Running Auto Fix Agent (Comprehensive Fix)")
    auto_fix_agent = AutoFixAgent()
    final_fixed_code = await auto_fix_agent.full_review_and_fix(sample_code_diff)
    print_before_after(sample_code_diff, final_fixed_code)


if __name__ == "__main__":
    asyncio.run(run_tests())

