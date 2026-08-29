import re

filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the Gemini AI chunk
pattern_ai = r'        # 4\. Check Gemini AI \(Ultimate Fallback for Indian Products\).*?return Response\(\{\'source\': \'not_found\'\}\)'
content = re.sub(pattern_ai, '        return Response({\'source\': \'not_found\'})', content, flags=re.DOTALL)

# 2. Inject imports at the top
if 'from .models import Category, Product, ProductImage, Favorite' not in content:
    content = content.replace('from .models import Category, Product, Favorite', 'from .models import Category, Product, ProductImage, Favorite')

# 3. Add custom create/update logic and delete_gallery_image to ProductViewSet
injection = """
    def _handle_gallery_images(self, product, request):
        images = request.FILES.getlist('gallery_images')
        for img in images:
            ProductImage.objects.create(product=product, image=img)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        product = Product.objects.get(id=response.data['id'])
        self._handle_gallery_images(product, request)
        # re-serialize to include the new images
        response.data = self.get_serializer(product).data
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        product = self.get_object()
        self._handle_gallery_images(product, request)
        response.data = self.get_serializer(product).data
        return response

    @action(detail=True, methods=['delete'], permission_classes=[IsOwnerUser])
    def delete_gallery_image(self, request, pk=None):
        product = self.get_object()
        image_id = request.data.get('image_id')
        if not image_id:
            return Response({'error': 'image_id is required'}, status=400)
        try:
            image = ProductImage.objects.get(id=image_id, product=product)
            image.delete()
            return Response({'success': True})
        except ProductImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=404)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
"""

content = content.replace('    @action(detail=False, methods=[\'post\'], permission_classes=[IsOwnerOrReadOnly])\n    def reorder(self, request):', injection + '    def reorder(self, request):', 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
