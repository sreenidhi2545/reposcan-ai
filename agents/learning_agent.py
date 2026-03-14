import json
import os

class LearningAgent:
    def __init__(self):
        self.knowledge_base = {
            "hardcoded_credentials": "Use environment variables instead",
            "sql_injection": "Use parameterized queries or ORM",
            "missing_error_handling": "Wrap in try/except with proper logging",
            "long_function": "Split into smaller single-purpose functions",
            "no_docstring": "Add docstrings to all public functions"
        }

    def learn(self, code_diff: str) -> dict:
        patterns_found = []
        summary_lines = []

        for pattern, suggestion in self.knowledge_base.items():
            # A simple keyword search, can be improved with regex
            keyword = pattern.replace("_", " ")
            if keyword in code_diff or pattern in code_diff:
                patterns_found.append({"pattern": pattern, "suggestion": suggestion})
                summary_lines.append(f"Found pattern '{pattern}'. Suggestion: {suggestion}")
        
        summary = " ".join(summary_lines) if summary_lines else "No known anti-patterns found."
        
        # Score based on number of patterns NOT found
        score = int(((len(self.knowledge_base) - len(patterns_found)) / len(self.knowledge_base)) * 100)

        return {
            "patterns_found": patterns_found,
            "summary": summary,
            "score": score
        }
