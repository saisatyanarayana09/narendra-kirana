import os

filepath = 'frontend/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('href="/favicon.svg"', 'href="/favicon.jpg"')
content = content.replace('type="image/svg+xml"', 'type="image/jpeg"')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
