import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'class FlashAnnouncement\(models\.Model\):[\s\S]*?def __str__\(self\):\n\s*return self\.text\n?'
content = re.sub(pattern, '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.strip() + '\n')
