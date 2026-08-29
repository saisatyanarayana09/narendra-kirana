import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove from Promise.all
content = re.sub(r'\s*api\.get\(\'/store/announcements/\'\),', '', content)
content = re.sub(r'const \[secRes, prodRes, annRes, banRes, setRes\] = await Promise\.all', 'const [secRes, prodRes, banRes, setRes] = await Promise.all', content)

# 2. Remove dragging logic if it exists
drag_pattern = r'    if \(type === \'announcement\'\) \{[\s\S]*?    if \(type === \'banner\'\) \{'
content = re.sub(drag_pattern, '    if (type === \'banner\') {', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
