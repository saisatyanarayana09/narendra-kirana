import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  const handleSubmit = async (e) => {", "  const closeForm = () => { setIsFormOpen(false); setEditingId(null);  };\n\n  const handleSubmit = async (e) => {")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
