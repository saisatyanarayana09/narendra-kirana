import os
import httpx

os.environ['GROQ_API_KEY'] = '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'
headers = {"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"}
response = httpx.get("https://api.groq.com/openai/v1/models", headers=headers)
models = response.json()
print("Available Models:")
for m in models.get("data", []):
    print(m["id"])
