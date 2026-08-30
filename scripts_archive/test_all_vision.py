import os
import base64
from groq import Groq

os.environ['GROQ_API_KEY'] = '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'
client = Groq()

models = ["openai/gpt-oss-120b", "groq/compound", "qwen/qwen3.6-27b", "canopylabs/orpheus-v1-english"]

image_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3U\xf2\x9c\x00\x00\x00\x00IEND\xaeB\x82'
b64_img = base64.b64encode(image_bytes).decode('utf-8')
data_uri = f"data:image/png;base64,{b64_img}"

for m in models:
    try:
        completion = client.chat.completions.create(
            model=m,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is in this image?"},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }]
        )
        print(f"[{m}] SUCCESS!")
    except Exception as e:
        print(f"[{m}] ERROR: {e}")
