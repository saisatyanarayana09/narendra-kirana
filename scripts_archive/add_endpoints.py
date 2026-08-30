
import sys

filepath = "S:/smart-kirana/backend/products/views.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

new_endpoints = """
    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
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
            return Response({"success": False, "error": str(e)})

    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def generate_description(self, request):
        from services.ai_product_service import AIProductService
        
        try:
            description = AIProductService.generate_description(request.data)
            return Response({"success": True, "description": description})
        except Exception as e:
            return Response({"success": False, "error": str(e)})

    @action(detail=False, methods=["post"], permission_classes=[IsOwnerOrReadOnly])
    def enhance_image(self, request):
        from services.image_enhancement_service import ImageEnhancementService
        from django.http import HttpResponse
        
        image_file = request.FILES.get("image")
        if not image_file:
            return Response({"success": False, "error": "No image provided"})
            
        if image_file.size > 10 * 1024 * 1024:
            return Response({"success": False, "error": "File too large. Maximum size is 10MB."})
            
        try:
            enhanced_bytes, mime_type = ImageEnhancementService.enhance_product_image(image_file.read())
            response = HttpResponse(enhanced_bytes, content_type=mime_type)
            # Custom header to indicate success if needed
            response["X-Enhancement-Success"] = "True"
            return response
        except Exception as e:
            return Response({"success": False, "error": str(e)}, status=400)
"""

if "class CategoryViewSet" in content:
    content = content.replace("class CategoryViewSet", new_endpoints + "\\n\\nclass CategoryViewSet")
else:
    print("Warning: CategoryViewSet not found. Check views.py structure.")

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)
print("Endpoints injected")

