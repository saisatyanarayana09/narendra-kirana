import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(', FlashAnnouncement', '')
content = content.replace(', FlashAnnouncementSerializer', '')

pattern = r'\nclass FlashAnnouncementViewSet\(viewsets\.ModelViewSet\):[\s\S]*?(?=\nclass |$)'
content = re.sub(pattern, '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.strip() + '\n')
