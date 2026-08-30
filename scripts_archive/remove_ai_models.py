import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove AI Management fields
content = re.sub(r'# AI Management.*?\n(    [a-z_]+\s*=\s*models\.[A-Za-z]+Field\(.*?\)\n)+', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
