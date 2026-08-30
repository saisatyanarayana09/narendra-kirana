import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("toast.error('AI processing failed.', { id: toastId });", "toast.error(AI processing failed: , { id: toastId }); console.error('Analyze Error:', err);")

content = content.replace("toast.error('Description generation failed.', { id: toastId });", "toast.error(Description generation failed: , { id: toastId }); console.error('Desc Error:', err);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
