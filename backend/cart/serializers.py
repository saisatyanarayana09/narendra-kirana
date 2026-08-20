from decimal import Decimal
from rest_framework import serializers
from .models import Cart, CartItem
from products.models import Product
from store.models import StoreSettings


def current_price(product):
    return product.offer_price if product.offer_price is not None else product.regular_price


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_unit = serializers.CharField(source='product.unit', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    is_in_stock = serializers.BooleanField(source='product.is_in_stock', read_only=True)
    stock_quantity = serializers.IntegerField(source='product.stock_quantity', read_only=True)
    max_order_quantity = serializers.IntegerField(source='product.max_order_quantity', read_only=True)
    quantity = serializers.IntegerField(min_value=1, required=False)
    unit_price = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_unit', 'product_image', 'is_in_stock', 'stock_quantity', 'max_order_quantity', 'quantity', 'unit_price', 'subtotal']
        read_only_fields = ['id']

    def get_unit_price(self, item):
        return current_price(item.product)

    def get_subtotal(self, item):
        return current_price(item.product) * item.quantity

    def validate_product(self, product):
        if not product.is_active or not product.is_in_stock:
            raise serializers.ValidationError('This product is not currently available.')
        return product


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    promo_code = serializers.CharField(source='promo_code.code', read_only=True)
    promo_discount = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    packaging_fee = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'promo_code', 'promo_discount', 'subtotal', 'discount', 'packaging_fee', 'total', 'updated_at']

    def _items(self, cart):
        if not hasattr(cart, '_prefetched_items'):
            cart._prefetched_items = list(cart.items.all())
        return cart._prefetched_items

    def get_subtotal(self, cart):
        return sum((item.product.regular_price * item.quantity for item in self._items(cart)), Decimal('0.00'))

    def get_discount(self, cart):
        return sum(((item.product.regular_price - current_price(item.product)) * item.quantity for item in self._items(cart)), Decimal('0.00'))

    def get_promo_discount(self, cart):
        base_total = sum((current_price(item.product) * item.quantity for item in self._items(cart)), Decimal('0.00'))
        if not cart.promo_code or not cart.promo_code.is_active or base_total < cart.promo_code.min_order_amount:
            return Decimal('0.00')
            
        eligible_total = base_total
        if hasattr(cart.promo_code, 'applicable_category') and cart.promo_code.applicable_category:
            eligible_total = sum((current_price(item.product) * item.quantity for item in self._items(cart) if item.product.category_id == cart.promo_code.applicable_category_id), Decimal('0.00'))
            
        if eligible_total == Decimal('0.00'):
            return Decimal('0.00')

        if cart.promo_code.discount_type == 'PERCENTAGE':
            return (eligible_total * cart.promo_code.discount_value / Decimal('100.00')).quantize(Decimal('0.01'))
            
        # For flat discount, don't discount more than the eligible total
        return min(cart.promo_code.discount_value, eligible_total)

    def get_packaging_fee(self, cart):
        if not self._items(cart): return Decimal('0.00')
        return StoreSettings.load().packaging_fee

    def get_total(self, cart):
        if not self._items(cart): return Decimal('0.00')
        base_total = sum((current_price(item.product) * item.quantity for item in self._items(cart)), Decimal('0.00'))
        return max(Decimal('0.00'), base_total - self.get_promo_discount(cart)) + self.get_packaging_fee(cart)
