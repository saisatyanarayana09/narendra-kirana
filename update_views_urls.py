import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('FlashAnnouncement', 'PromoBanner')
content = content.replace('announcements', 'promo_banners')
content = content.replace('ann', 'banner')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

filepath = 'backend/store/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('FlashAnnouncement', 'PromoBanner')
content = content.replace('announcements', 'promo-banners')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
