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
        default_models = "llama-3.1-8b-instant,llama-3.3-70b-versatile"
        configured_models = os.getenv("GROQ_MODEL_CANDIDATES", default_models)
        self.model_candidates = [m.strip() for m in configured_models.split(",") if m.strip()]
        if not self.model_candidates:
            self.model_candidates = ["llama-3.1-8b-instant"]
        try:
            self.max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "700"))
        except ValueError:
            self.max_tokens = 700

    def _create_chat_completion(self, messages, temperature=0.1):
        last_error = None
        for model in self.model_candidates:
            try:
                return self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=self.max_tokens,
                )
            except RateLimitError as e:
                last_error = e
                continue
            except Exception as e:
                last_error = e
                continue
        if last_error:
            raise last_error
        raise RuntimeError("No available Groq model candidates")

    def analyze(self, content: str, prompt: str) -> dict:
        try:
            chat_completion = self._create_chat_completion(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
                temperature=0.1,
            )
            response_text = chat_completion.choices[0].message.content
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                import re
                import ast
                json_match = re.search(
                    r'```json\n(.*?)\n```', 
                    response_text, re.DOTALL)
                if json_match:
                    fenced_text = json_match.group(1).strip()
                    try:
                        return json.loads(fenced_text)
                    except json.JSONDecodeError:
                        pass
                object_match = re.search(r'\{[\s\S]*\}', response_text)
                if object_match:
                    candidate = object_match.group(0).strip()
                    try:
                        return json.loads(candidate)
                    except json.JSONDecodeError:
                        try:
                            parsed = ast.literal_eval(candidate)
                            return json.loads(json.dumps(parsed))
                        except (ValueError, SyntaxError):
                            normalized = re.sub(r"\bTrue\b", "true", candidate)
                            normalized = re.sub(r"\bFalse\b", "false", normalized)
                            normalized = re.sub(r"\bNone\b", "null", normalized)
                            normalized = normalized.replace("'", '"')
                            try:
                                return json.loads(normalized)
                            except json.JSONDecodeError:
                                pass
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
            chat_completion = self._create_chat_completion(
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": content},
                ],
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

