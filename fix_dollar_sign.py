import re

filepath = 'frontend/src/owner/components/MidPageBannerEditor.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('/store/homepage-sections//', '/store/homepage-sections//')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
