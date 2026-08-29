import re

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setAnnouncements extracting .results
old_set = "setAnnouncements(annRes.data.filter(a => a.is_active).sort((a, b) => a.display_order - b.display_order));"
new_set = "const annData = annRes.data.results || annRes.data || [];\n        setAnnouncements(annData.filter(a => a.is_active).sort((a, b) => a.display_order - b.display_order));"

if old_set in content:
    content = content.replace(old_set, new_set)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
