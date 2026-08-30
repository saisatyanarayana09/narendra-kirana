import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('HomepageSectionSerializerSerializer', 'HomepageSectionSerializer')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
