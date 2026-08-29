import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '<Route path="/owner/login"element={<OwnerLogin />} />'
replacement = target + '\n        <Route path="/owner/welcome" element={<Guard><Welcome /></Guard>} />'

if '<Route path="/owner/welcome"' not in content:
    content = content.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
