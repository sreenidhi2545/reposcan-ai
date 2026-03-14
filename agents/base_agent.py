
import os
import json
import re
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

class BaseAgent:
    """
    A base agent for interacting with the Groq API.
    """
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in .env file")
        self.client = AsyncGroq(api_key=self.groq_api_key)

    async def analyze(self, content: str, prompt: str) -> dict:
        """
        Analyzes the given content using the Groq API.

        Args:
            content: The content to analyze.
            prompt: The prompt to use for the analysis.

        Returns:
            A dictionary containing the analysis result.
        """
        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": prompt,
                    },
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            response_text = chat_completion.choices[0].message.content
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                return {"raw": response_text}
        except Exception as e:
            return {"error": str(e)}

    async def fix(self, code: str, issues: list) -> str:
        """
        Fixes the given code based on the provided issues.
        """
        prompt = """You are an expert software engineer. You will receive code and 
a list of issues found in it. Fix ALL the issues and return 
ONLY the complete, corrected, raw code. Do not include any explanation, 
markdown, or JSON. Just the raw, fixed code.
"""
        
        issues_str = json.dumps(issues, indent=2)
        content = f"Original Code:\n```python\n{code}\n```\n\nIssues:\n{issues_str}"

        try:
            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": prompt,
                    },
                    {
                        "role": "user",
                        "content": content,
                    },
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            return f"# Error fixing code: {e}"

if __name__ == '__main__':
    # Example usage:
    # Make sure to have a .env file with GROQ_API_KEY="YOUR_API_KEY"
    agent = BaseAgent()
    example_content = "def hello_world():\n    print('Hello, world!')"
    example_prompt = "Is this code valid Python? Respond in JSON format with a 'valid' boolean field."
    result = agent.analyze(example_content, example_prompt)
    print(result)
