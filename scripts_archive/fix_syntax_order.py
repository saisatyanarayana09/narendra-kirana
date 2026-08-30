import os

filepath = 'frontend/src/owner/pages/OrderDetails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("} , MapPin }", ", MapPin }")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
