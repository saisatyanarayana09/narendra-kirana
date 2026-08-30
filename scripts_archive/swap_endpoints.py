import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('/store/promo-banners/', '/offers/banners/')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
