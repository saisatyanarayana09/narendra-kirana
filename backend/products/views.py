from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from .models import Category, Product, Favorite
from .serializers import CategorySerializer, ProductSerializer, FavoriteSerializer
from accounts.permissions import IsOwnerOrReadOnly

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

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        categories = []
        for update in updates:
            cat = Category(id=update['id'], display_order=update['display_order'])
            categories.append(cat)
        Category.objects.bulk_update(categories, ['display_order'])
        return Response({'status': 'reordered'})

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all().order_by('display_order', '-created_at')
    serializer_class = ProductSerializer
    permission_classes = [IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'is_active', 'is_in_stock']
    search_fields = ['name', 'brand', 'description']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Non-owners only see active products
        if not (self.request.user and self.request.user.is_authenticated and getattr(self.request.user, 'is_owner', False)):
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'], permission_classes=[IsOwnerOrReadOnly])
    def barcode_lookup(self, request):
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
            
        # 2. Check Open Food Facts API (Global Grocery Database)
        try:
            import requests
            headers = {'User-Agent': 'SmartKirana/1.0'}
            url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1:
                    product_data = data.get('product', {})
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
            
        return Response({'source': 'not_found'})

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerOrReadOnly])
    def reorder(self, request):
        updates = request.data
        products = []
        for update in updates:
            prod = Product(id=update['id'], display_order=update['display_order'])
            products.append(prod)
        Product.objects.bulk_update(products, ['display_order'])
        return Response({'status': 'reordered'})

class FavoriteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FavoriteSerializer

    def get_queryset(self):
        return Favorite.objects.select_related('product', 'product__category').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
