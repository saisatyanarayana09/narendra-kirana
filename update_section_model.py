import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add section_type, banner_image, banner_link to HomepageSection
class_def = 'class HomepageSection(models.Model):'
new_fields = '''
    SECTION_TYPES = (
        ('products', 'Product Grid'),
        ('banner', 'Mid-Page Banner'),
    )
    section_type = models.CharField(max_length=20, choices=SECTION_TYPES, default='products')
    banner_image = models.ImageField(upload_to='banners/', null=True, blank=True)
    banner_link = models.CharField(max_length=500, null=True, blank=True, help_text="Optional URL to navigate to when clicked")
'''

content = content.replace(class_def, class_def + new_fields)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
