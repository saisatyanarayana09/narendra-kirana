import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(',1{', '\u20b9{')
content = content.replace('o" Added!', '\u2713 Added!')
content = content.replace('A }', '\u2022 }')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Artifacts replaced")
