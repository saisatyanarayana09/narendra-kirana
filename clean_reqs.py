import re

filepath = 'backend/requirements.txt'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'google-generativeai.*?\n', '', content)
content = re.sub(r'groq.*?\n', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
