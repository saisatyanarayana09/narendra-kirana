import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'ScanLine,\s*', '', content)
content = re.sub(r'FileText,\s*', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
