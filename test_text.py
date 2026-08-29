import os
from groq import Groq

os.environ['GROQ_API_KEY'] = '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'
client = Groq()

models = ["openai/gpt-oss-120b", "groq/compound", "qwen/qwen3.6-27b"]
for m in models:
    try:
        completion = client.chat.completions.create(
            model=m,
            messages=[{"role": "user", "content": "Write a 1-sentence product description for Atta."}]
        )
        print(f"[{m}] {completion.choices[0].message.content}")
    except Exception as e:
        print(f"[{m}] ERROR: {e}")
