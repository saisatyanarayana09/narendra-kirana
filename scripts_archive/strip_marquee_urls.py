import re

filepath = 'backend/store/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'router\.register\(r\'announcements\', FlashAnnouncementViewSet\)\n', '', content)
content = content.replace(', FlashAnnouncementViewSet', '')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
