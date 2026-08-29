import re

filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Delete vision_lookup specifically
pattern = r'    @action\(detail=False, methods=\[\'post\'\], permission_classes=\[IsOwnerOrReadOnly\]\)\n    def vision_lookup\(self, request\):.*?(?=    @action\(detail=False, methods=\[\'post\'\], permission_classes=\[IsOwnerOrReadOnly\]\)\n    def reorder\(self, request\):)'
content = re.sub(pattern, '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
