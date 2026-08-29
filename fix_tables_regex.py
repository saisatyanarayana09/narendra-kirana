import re

filepath = 'frontend/src/owner/pages/Referrals.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Match <table ...> ... </table>
pattern = r'(<table[\s\S]*?</table>)'
replacement = r'<div className="overflow-x-auto">\n\1\n</div>'
content = re.sub(pattern, replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
