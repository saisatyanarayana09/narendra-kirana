import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Broadcast card from feed
broadcast_ui = r'\{section\.title\.startsWith\(\'BROADCAST::\'\) \? \([\s\S]*?\} : \(\n\s*<div'
content = re.sub(broadcast_ui, '<div', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
