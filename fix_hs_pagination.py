import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure HomepageSectionViewSet has pagination_class = None
hs_old = "    queryset = HomepageSection.objects.prefetch_related('section_products__product').all()\n    serializer_class = HomepageSectionSerializer"
hs_new = hs_old + "\n    pagination_class = None"

if "pagination_class = None" not in content.split("class HomepageSectionViewSet")[1].split("def get_permissions")[0]:
    content = content.replace(hs_old, hs_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
