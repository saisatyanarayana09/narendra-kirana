import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

broadcast_block = r'\s*if \(section\.title\.startsWith\(\'BROADCAST::\'\)\) \{\s*return \(\s*<div.*?</div>\s*\);\s*\}\s*'
content = re.sub(broadcast_block, '\n', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
