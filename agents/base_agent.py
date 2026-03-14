import os
import json
from groq import Groq, RateLimitError
from dotenv import load_dotenv

load_dotenv()

class BaseAgent:
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in .env file")
        self.client = Groq(api_key=self.groq_api_key)

    def analyze(self, content: str, prompt: str) -> dict:
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            response_text = chat_completion.choices[0].message.content
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                import re
                json_match = re.search(
                    r'```json\n(.*?)\n```', 
                    response_text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(1))
                return {"raw": response_text}
        except RateLimitError as e:
            return {"error": "Rate limit exceeded. Please check your Groq plan and billing details.", "details": str(e)}
        except Exception as e:
            return {"error": str(e)}

    def fix(self, code: str, issues: list) -> str:
        prompt = """You are an expert software engineer.
Fix ALL issues in this code.
Return ONLY the complete fixed Python code.
No explanation, no markdown, just the raw fixed code."""
        issues_str = json.dumps(issues, indent=2)
        content = f"Code:\n{code}\n\nIssues:\n{issues_str}"
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            response = chat_completion.choices[0].message.content
            import re
            code_match = re.search(
                r'```python\n(.*?)\n```', 
                response, re.DOTALL)
            if code_match:
                return code_match.group(1)
            return response
        except RateLimitError as e:
            return f"# Error: Rate limit exceeded. Please check your Groq plan and billing details. Details: {e}"
        except Exception as e:
            return f"# Error: {e}"

