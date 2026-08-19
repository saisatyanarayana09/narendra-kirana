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
