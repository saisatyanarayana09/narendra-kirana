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
        fields = [
            'id', 'customer', 'customer_name', 'status', 'total_amount',
            'discount_applied', 'promo_discount', 'wallet_discount',
            'packaging_fee', 'pickup_time', 'customer_note', 'owner_note',
            'items', 'created_at', 'updated_at', 'order_type',
            'delivery_address', 'delivery_pincode', 'delivery_latitude',
            'delivery_longitude', 'delivery_fee',
            'delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id'
        ]
        read_only_fields = [
            'id', 'customer', 'status', 'total_amount',
            'discount_applied', 'promo_discount', 'wallet_discount',
            'packaging_fee', 'items', 'created_at', 'updated_at',
            'order_type', 'delivery_address', 'delivery_pincode',
            'delivery_latitude', 'delivery_longitude', 'delivery_fee',
            'delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id'
        ]


class CheckoutSerializer(serializers.Serializer):
    pickup_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    customer_note = serializers.CharField(required=False, allow_blank=True)
    use_wallet = serializers.BooleanField(default=False)
    order_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    delivery_pincode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_slot_date = serializers.DateField(required=False, allow_null=True)
    delivery_slot_label = serializers.CharField(max_length=100, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=20, required=False, default="COD")
    upi_transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True)


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
