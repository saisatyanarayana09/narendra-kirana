import re

filepath = 'backend/store/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('FlashAnnouncement', 'PromoBanner')
content = content.replace('FlashAnnouncementSerializer', 'PromoBannerSerializer')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
