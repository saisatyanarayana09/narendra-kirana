import os

filepath = 'frontend/public/manifest.json'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('favicon.svg', 'favicon.jpg')
content = content.replace('image/svg+xml', 'image/jpeg')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
