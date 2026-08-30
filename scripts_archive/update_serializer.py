import os

filepath = 'backend/orders/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_serializer = """class CheckoutSerializer(serializers.Serializer):
    pickup_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    customer_note = serializers.CharField(required=False, allow_blank=True)
    use_wallet = serializers.BooleanField(default=False)"""

new_serializer = """class CheckoutSerializer(serializers.Serializer):
    pickup_time = serializers.CharField(max_length=80, required=False, allow_blank=True)
    customer_note = serializers.CharField(required=False, allow_blank=True)
    use_wallet = serializers.BooleanField(default=False)
    order_type = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True)
    delivery_pincode = serializers.CharField(max_length=20, required=False, allow_blank=True)
    delivery_latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    delivery_longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)"""

content = content.replace(old_serializer, new_serializer)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
