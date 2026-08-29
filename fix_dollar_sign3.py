import re

filepath = 'frontend/src/owner/components/MidPageBannerEditor.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('await api.patch(/store/homepage-sections//, formData, {', 'await api.patch(`/store/homepage-sections/${section.id}/`, formData, {')
content = content.replace("await api.patch(/store/homepage-sections//, { banner_link: link, section_type: 'banner' });", "await api.patch(`/store/homepage-sections/${section.id}/`, { banner_link: link, section_type: 'banner' });")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
