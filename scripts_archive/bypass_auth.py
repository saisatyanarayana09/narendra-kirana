import re

filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("permission_classes=[IsOwnerOrReadOnly]", "permission_classes=[]")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
