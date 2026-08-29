import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setAnnouncements(annRes.data || []);", "setAnnouncements(annRes.data.results || annRes.data || []);")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
