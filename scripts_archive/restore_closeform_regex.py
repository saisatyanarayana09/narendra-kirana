import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'([ \t]*)const handleSubmit = async \(e\) => \{', r'\1const closeForm = () => { setIsFormOpen(false); setEditingId(null); };\n\n\1const handleSubmit = async (e) => {', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
