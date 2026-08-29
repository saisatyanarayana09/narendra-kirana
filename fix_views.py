import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('PromoBbannerer', 'PromoBanner')
content = content.replace('bbannerers', 'banners')
content = content.replace('bbannerer', 'banner')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
