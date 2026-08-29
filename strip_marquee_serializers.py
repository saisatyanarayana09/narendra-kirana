import re

filepath = 'backend/store/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(', FlashAnnouncement', '')

pattern = r'class FlashAnnouncementSerializer\(serializers\.ModelSerializer\):[\s\S]*?fields = \'__all__\'\n'
content = re.sub(pattern, '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.strip() + '\n')
