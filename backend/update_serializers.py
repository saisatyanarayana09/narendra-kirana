import os

# 1. Update CheckoutSerializer
filepath = 'orders/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_checkout = """class CheckoutSerializer(serializers.Serializer):
    use_wallet = serializers.BooleanField(default=False)
    pickup_time = serializers.CharField(max_length=80, allow_blank=True, required=False)
    customer_note = serializers.CharField(allow_blank=True, required=False)"""

new_checkout = """class CheckoutSerializer(serializers.Serializer):
    use_wallet = serializers.BooleanField(default=False)
    pickup_time = serializers.CharField(max_length=80, allow_blank=True, required=False)
    customer_note = serializers.CharField(allow_blank=True, required=False)
    order_type = serializers.ChoiceField(choices=['PICKUP', 'DELIVERY'], default='PICKUP')
    delivery_address = serializers.CharField(allow_blank=True, required=False)
    delivery_pincode = serializers.CharField(max_length=20, allow_blank=True, required=False)"""

content = content.replace(old_checkout, new_checkout)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
