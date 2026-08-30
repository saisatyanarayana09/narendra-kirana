import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove FlashAnnouncement Model
content = re.sub(r'class FlashAnnouncement\(models\.Model\):[\s\S]*?(?=class |$)', '', content)

# Remove settings
content = re.sub(r'    # Flash Announcement Theme\n    announcement_bg_color = models\.CharField\(max_length=20, default="#ef4444"\)\n    announcement_text_color = models\.CharField\(max_length=20, default="#ffffff"\)\n', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.strip() + '\n')
