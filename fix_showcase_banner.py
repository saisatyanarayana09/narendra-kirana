import re
filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("formData.append('image', file);", "formData.append('image', file);\n    formData.append('title', file.name || 'Banner');")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
