from django.db import transaction
from rest_framework import generics, status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from accounts.permissions import IsCustomerUser
from .models import Cart, CartItem
from .serializers import CartItemSerializer, CartSerializer


def customer_cart(user):
    cart, _ = Cart.objects.get_or_create(customer=user)
    return cart


class CartDetailView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_object(self):
        cart = customer_cart(self.request.user)
        return Cart.objects.prefetch_related('items__product').get(id=cart.id)


class CartItemCreateView(generics.CreateAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data['product']
        cart = customer_cart(request.user)
        
        item = CartItem.objects.select_for_update().filter(cart=cart, product=product).first()
        current_qty = item.quantity if item else 0
        qty_to_add = serializer.validated_data.get('quantity', 1)
        new_qty = current_qty + qty_to_add
        
        if product.max_order_quantity and product.max_order_quantity > 0 and new_qty > product.max_order_quantity:
            return Response({'detail': f'You can only order up to {product.max_order_quantity} of this item.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if product.stock_quantity and product.stock_quantity > 0 and new_qty > product.stock_quantity:
            return Response({'detail': f'Only {product.stock_quantity} left in stock.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not product.is_in_stock:
            return Response({'detail': 'This product is out of stock.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not item:
            item = CartItem.objects.create(cart=cart, product=product, quantity=qty_to_add)
        else:
            item.quantity = new_qty
            item.save(update_fields=['quantity'])
            
        return Response(CartItemSerializer(item, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

class CartItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CartItemSerializer
    permission_classes = [IsAuthenticated, IsCustomerUser]

    def get_queryset(self):
        return CartItem.objects.filter(cart__customer=self.request.user).select_related('product')

    def perform_update(self, serializer):
        item = self.get_object()
        new_qty = serializer.validated_data.get('quantity', item.quantity)
        product = item.product
        
        if product.max_order_quantity and product.max_order_quantity > 0 and new_qty > product.max_order_quantity:
            raise serializers.ValidationError({'detail': f'You can only order up to {product.max_order_quantity} of this item.'})
            
        if product.stock_quantity and product.stock_quantity > 0 and new_qty > product.stock_quantity:
            raise serializers.ValidationError({'detail': f'Only {product.stock_quantity} left in stock.'})
            
        if not product.is_in_stock:
            raise serializers.ValidationError({'detail': 'This product is out of stock.'})
            
        serializer.save()


from rest_framework.views import APIView
from django.utils import timezone
from offers.models import PromoCode

class ApplyPromoView(APIView):
    permission_classes = [IsAuthenticated, IsCustomerUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        code = request.data.get('code', '').strip()
        cart = customer_cart(request.user)
        
        if not code:
            cart.promo_code = None
            cart.save(update_fields=['promo_code'])
            return Response(CartSerializer(cart, context={'request': request}).data)

        try:
            promo = PromoCode.objects.get(code__iexact=code, is_active=True)
        except PromoCode.DoesNotExist:
            return Response({'detail': 'Invalid or inactive promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        if promo.expiration_date and promo.expiration_date < timezone.now():
            return Response({'detail': 'This promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check usage limits
        if getattr(promo, 'max_uses_per_user', 0) > 0:
            from offers.models import PromoUsage
            usage_count = PromoUsage.objects.filter(promo_code=promo, user=request.user).count()
            if usage_count >= promo.max_uses_per_user:
                return Response({'detail': f'You have reached the maximum usage limit ({promo.max_uses_per_user}) for this promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        # We attach it now. The CartSerializer will check if it meets min_order_amount
        cart.promo_code = promo
        cart.save(update_fields=['promo_code'])
        return Response(CartSerializer(cart, context={'request': request}).data)

