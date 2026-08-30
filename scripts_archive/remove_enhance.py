import re
filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'    @action\(detail=False, methods=\["post"\], permission_classes=\[IsOwnerOrReadOnly\]\)\n    def enhance_image\(self, request\):.*?return Response\(\{"success": False, "error": str\(e\)\}, status=500\)', re.DOTALL)
content = pattern.sub('', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed enhance_image view")
