from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product, ProductImage, Favorite
from .serializers import CategorySerializer, ProductSerializer, FavoriteSerializer
from accounts.permissions import IsOwnerOrReadOnly, IsOwnerUser

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('display_order', 'name')
    serializer_class = CategorySerializer
    permission_classes = [IsOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active categories
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset


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
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        categories = []
        for update in updates:
            try:
                cat = Category(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                categories.append(cat)
            except (KeyError, ValueError, TypeError):
                continue
                
        if categories:
            Category.objects.bulk_update(categories, ['display_order'])
        return Response({'status': 'reordered'})

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('gallery_images').all().order_by('display_order', '-created_at')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_in_stock']
    search_fields = ['name', 'brand', 'description']
    ordering_fields = ['offer_price', 'regular_price', 'created_at', 'name']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'barcode_lookup']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active products
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def barcode_lookup(self, request):
        # Throttle manually for this specific action to prevent AI abuse
        if not request.user.is_authenticated:
            throttle = AnonRateThrottle()
            if not throttle.allow_request(request, self):
                return Response({'error': 'Rate limit exceeded. Please wait.'}, status=429)
        barcode = request.query_params.get('barcode')
        if not barcode:
            return Response({'error': 'Barcode is required'}, status=400)
            
        # 1. Check local DB
        local_product = Product.objects.filter(sku=barcode).first()
        if local_product:
            return Response({
                'source': 'local',
                'product': ProductSerializer(local_product, context={'request': request}).data
            })
            
        import requests
        headers = {'User-Agent': 'SmartKirana/1.0'}
        
        # 2. Check Open Food Facts API (Primary)
        try:
            url_off = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            response_off = requests.get(url_off, headers=headers, timeout=5)
            if response_off.status_code == 200:
                data_off = response_off.json()
                if data_off.get('status') == 1:
                    product_data = data_off.get('product', {})
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': product_data.get('product_name', ''),
                            'brand': product_data.get('brands', ''),
                            'unit': product_data.get('quantity', ''),
                            'image_url': product_data.get('image_front_url', ''),
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('Open Food Facts API error:', str(e))
            
        # 3. Check UPCitemdb API (Fallback)
        try:
            url_upc = f"https://api.upcitemdb.com/prod/trial/lookup?upc={barcode}"
            response_upc = requests.get(url_upc, headers=headers, timeout=5)
            if response_upc.status_code == 200:
                data_upc = response_upc.json()
                if data_upc.get('code') == 'OK' and len(data_upc.get('items', [])) > 0:
                    item = data_upc['items'][0]
                    return Response({
                        'source': 'external',
                        'product': {
                            'name': item.get('title', ''),
                            'brand': item.get('brand', ''),
                            'unit': item.get('size', ''),
                            'image_url': item.get('images', [])[0] if item.get('images') else '',
                            'sku': barcode
                        }
                    })
        except Exception as e:
            print('UPCitemdb API error:', str(e))
            
        return Response({'source': 'not_found'})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        if not isinstance(updates, list):
            return Response({'error': 'Expected a list of updates'}, status=400)
            
        products = []
        for update in updates:
            try:
                prod = Product(
                    id=int(update['id']), 
                    display_order=int(update.get('display_order', 0))
                )
                products.append(prod)
            except (KeyError, ValueError, TypeError):
                continue
                
        if products:
            Product.objects.bulk_update(products, ['display_order'])
        return Response({'status': 'reordered'})

class FavoriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.select_related('product', 'product__category').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
