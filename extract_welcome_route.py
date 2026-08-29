import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the nested welcome route
content = content.replace('<Route path="welcome" element={<Welcome />} />', '')

# Insert it as a standalone route above the OwnerLayout
target = '<Route path="/owner" element={<Guard><OwnerLayout /></Guard>}>'
replacement = '<Route path="/owner/welcome" element={<Guard><Welcome /></Guard>} />\n        ' + target
if '<Route path="/owner/welcome"' not in content:
    content = content.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
