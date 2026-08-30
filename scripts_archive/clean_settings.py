import re

filepath = 'frontend/src/owner/pages/Settings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Strip AI Management Section
pattern = r'\s*\{\/\* AI Management Section \*\/\}.*?(?=<div className="flex justify-end">)'
content = re.sub(pattern, '\n        ', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
