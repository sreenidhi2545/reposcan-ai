import os
import json
from groq import Groq, RateLimitError
from dotenv import load_dotenv
import secrets_manager

load_dotenv()

class BaseAgent:
    def __init__(self):
        self.groq_api_key = secrets_manager.get_secret("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in secrets manager")
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
                    r'