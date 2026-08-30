import re

filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_analyze = '''    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def analyze_image(self, request):
        from services.ai_product_service import AIProductService
        
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"success": False, "error": "No image provided"})
            
        if image_file.size > 5 * 1024 * 1024:
            return Response({"success": False, "error": "File too large. Maximum size is 5MB."})
            
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if image_file.content_type not in allowed_types:
            return Response({"success": False, "error": "Invalid file type. Only JPEG, PNG, and WebP are allowed."})
            
        try:
            data = AIProductService.analyze_product_image(image_file.read(), image_file.content_type)
            return Response({"success": True, "data": data})
        except Exception as e:
            return Response({"success": False, "error": str(e)})'''

new_analyze = '''    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def analyze_image(self, request):
        from services.ai_product_service import AIProductService
        
        images_data = []
        for key in ['imageFront', 'imageBack', 'image']:
            image_file = request.FILES.get(key)
            if image_file:
                if image_file.size > 10 * 1024 * 1024:
                    continue
                allowed_types = ["image/jpeg", "image/png", "image/webp"]
                if image_file.content_type in allowed_types:
                    images_data.append({
                        'bytes': image_file.read(),
                        'mime': image_file.content_type
                    })
                    
        if not images_data:
            return Response({"success": False, "error": "No valid image provided"})
            
        try:
            data = AIProductService.analyze_product_image(images_data)
            # The frontend expects extracted_data in data.extracted_data
            return Response({"success": True, "extracted_data": data})
        except Exception as e:
            return Response({"success": False, "error": str(e)})'''

if old_analyze in content:
    content = content.replace(old_analyze, new_analyze)
    print("Replaced analyze_image")
else:
    print("Could not find analyze_image")
    # try regex
    pattern = re.compile(r'\s*@action\(detail=False, methods=\["post"\], permission_classes=\[IsOwnerOrReadOnly\]\)\n\s*def analyze_image\(self, request\):[\s\S]*?(?=\s*@action|\s*class )', re.DOTALL)
    if pattern.search(content):
        content = pattern.sub('\n' + new_analyze + '\n', content)
        print("Replaced analyze_image via regex")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
