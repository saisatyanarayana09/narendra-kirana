import os

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("XCircle } , MapPin, Edit2 }", "XCircle, MapPin, Edit2 }")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
