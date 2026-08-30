import re

filepath = 'frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the block by finding 'Broadcast Banner Tool' to 'Action Center'
content = re.sub(r'      \{\/\* Broadcast Banner Tool \*\/\}[\s\S]*?\{\/\* Action Center \*\/\}', '      {/* Action Center */}', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
