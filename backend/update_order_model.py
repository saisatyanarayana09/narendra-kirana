import os

filepath = 'orders/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_order = """    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pickup_time = models.CharField(max_length=80, blank=True)
    customer_note = models.TextField(blank=True)
    owner_note = models.TextField(blank=True)"""

new_order = """    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    
    # Delivery Info
    order_type = models.CharField(max_length=15, choices=[('PICKUP', 'Store Pickup'), ('DELIVERY', 'Home Delivery')], default='PICKUP')
    delivery_address = models.TextField(blank=True)
    delivery_pincode = models.CharField(max_length=20, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pickup_time = models.CharField(max_length=80, blank=True)
    customer_note = models.TextField(blank=True)
    owner_note = models.TextField(blank=True)"""

content = content.replace(old_order, new_order)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
