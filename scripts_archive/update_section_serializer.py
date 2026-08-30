import re

filepath = 'backend/store/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("fields = ['id', 'title', 'display_order', 'is_active', 'section_products']", "fields = ['id', 'title', 'section_type', 'banner_image', 'banner_link', 'display_order', 'is_active', 'section_products']")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
