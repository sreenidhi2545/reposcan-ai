from agents.base_agent import BaseAgent
import json
from jsonschema import validate, ValidationError

class CodeQualityAgent(BaseAgent):
    def __init__(self):
        self.schema = {
            "type": "object",
            "properties": {
                "issues": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file": {"type": "string"},
                            "type": {"type": "string"},
                            "severity": {"type": "string"},
                            "confidence": {"type": "integer"},
                            "issue": {"type": "string"},
                            "impact": {"type": "string"},
                            "fix": {"type": "string"}
                        },
                        "required": ["file", "type", "severity", "confidence", "issue", "impact", "fix"]
                    }
                },
                "score": {"type": "integer"},
                "summary": {"type": "string"}
            },
            "required": ["issues", "score", "summary"]
        }

    def analyze(self, code_diff: str) -> dict:
        prompt = """You are a code quality expert.
Analyze this code for quality issues.
IMPORTANT: For each issue, the 'file' field must contain the exact file path as it appears after 'FILE:' in the code content provided. Never use 'unknown' as the file value.
Return ONLY valid raw JSON (no markdown):
{
  "issues": [
    {
      "file": "actual/path/to/file.py",
      "type": "Code Smell",
      "severity": "high",
      "confidence": 90,
      "issue": "description",
      "impact": "what breaks",
      "fix": "how to fix"
    }
  ],
  "score": 20,
  "summary": "one line summary"
}
Check for: cyclomatic complexity, code smells,
naming conventions, duplicate code, 
maintainability, function length."""
        result = super().analyze(code_diff, prompt)
        if "raw" in result:
            import re
            match = re.search(
                r'\{.*\}', result["raw"], re.DOTALL)
            if match:
                try:
                    result = json.loads(match.group())
                    self.validate_json(result)
                except (json.JSONDecodeError, ValidationError):
                    pass
        return result

    def validate_json(self, json_data):
        try:
            validate(instance=json_data, schema=self.schema)
        except ValidationError as e:
            raise ValidationError(f"Invalid JSON: {e}")

    def analyze_and_fix(self, code_diff: str) -> dict:
        analysis = self.analyze(code_diff)
        issues = analysis.get("issues", [])
        fixed_code = self.fix(code_diff, issues)
        return {
            "issues": issues,
            "score": analysis.get("score", 0),
            "summary": analysis.get("summary", ""),
            "fixed_code": fixed_code,
            "changes_made": [
                f"Fixed: {i.get('issue','')}" 
                for i in issues
            ]
        }