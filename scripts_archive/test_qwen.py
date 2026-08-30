import os
from groq import Groq

os.environ['GROQ_API_KEY'] = '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'
client = Groq()

try:
    completion = client.chat.completions.create(
        model="qwen/qwen3.6-27b",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": "What is in this image?"},
                {"type": "image_url", "image_url": {"url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Statue_of_Liberty%2C_NY.jpg/500px-Statue_of_Liberty%2C_NY.jpg"}}
            ]
        }]
    )
    print("SUCCESS!", completion.choices[0].message.content)
except Exception as e:
    print("ERROR:", e)
