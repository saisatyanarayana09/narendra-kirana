import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_call = '''                completion = client.chat.completions.create(
                    model=text_model,
                    messages=[{"role": "user", "content": prompt}]
                )'''

new_call = '''                completion = client.chat.completions.create(
                    model=text_model,
                    messages=[
                        {"role": "system", "content": "You are an API that ONLY outputs the final product description. You MUST NOT output any internal thoughts, reasoning, formatting, quotes, or conversational text. Output ONLY the 3-sentence description."},
                        {"role": "user", "content": prompt}
                    ]
                )'''

content = content.replace(old_call, new_call)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
