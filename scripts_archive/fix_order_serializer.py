import os
import re

filepath = 'backend/orders/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_meta = """    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_name', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'pickup_time', 'customer_note', 'owner_note', 'items', 'created_at', 'updated_at']
        read_only_fields = ['id', 'customer', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'items', 'created_at', 'updated_at']"""

new_meta = """    class Meta:
        model = Order
        fields = ['id', 'customer', 'customer_name', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'pickup_time', 'customer_note', 'owner_note', 'items', 'created_at', 'updated_at', 'order_type', 'delivery_address', 'delivery_pincode', 'delivery_latitude', 'delivery_longitude', 'delivery_fee']
        read_only_fields = ['id', 'customer', 'status', 'total_amount', 'discount_applied', 'promo_discount', 'wallet_discount', 'packaging_fee', 'items', 'created_at', 'updated_at', 'order_type', 'delivery_address', 'delivery_pincode', 'delivery_latitude', 'delivery_longitude', 'delivery_fee']"""

content = content.replace(old_meta, new_meta)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
