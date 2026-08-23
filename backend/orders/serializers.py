from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name_snapshot', 'unit_snapshot', 'price_snapshot', 'quantity', 'subtotal', 'status']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_name', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'pickup_time', 'customer_note', 'owner_note', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'customer', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'items', 'created_at', 'updated_at']


class CheckoutSerializer(serializers.Serializer):
    pickup_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    customer_note = serializers.CharField(required=False, allow_blank=True)
    use_wallet = serializers.BooleanField(default=False)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
