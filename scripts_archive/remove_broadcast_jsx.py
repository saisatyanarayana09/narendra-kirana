import re

filepath = 'frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the Broadcast Banner Tool JSX
pattern = r'      \{\/\* Broadcast Banner Tool \*\/\}.*?<\/button>\n            <\/div>\n          <\/div>\n        <\/div>'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
