import os

filepath = 'S:/smart-kirana/frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("display_order: -1", "display_order: 0")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard broadcast display_order fixed")
