import os

filepath = 'backend/orders/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_fee = Decimal('0.00')"""

new_logic = """        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_latitude = checkout.validated_data.get('delivery_latitude')
        delivery_longitude = checkout.validated_data.get('delivery_longitude')
        delivery_fee = Decimal('0.00')"""

content = content.replace(old_logic, new_logic)

old_create = """            status=initial_status,
            order_type=order_type,
            delivery_address=delivery_address,
            delivery_pincode=delivery_pincode,
            delivery_fee=delivery_fee
        )"""

new_create = """            status=initial_status,
            order_type=order_type,
            delivery_address=delivery_address,
            delivery_pincode=delivery_pincode,
            delivery_latitude=delivery_latitude,
            delivery_longitude=delivery_longitude,
            delivery_fee=delivery_fee
        )"""

content = content.replace(old_create, new_create)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
