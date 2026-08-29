import os

filepath = 'store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_delivery = """    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    free_delivery_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)"""

new_delivery = """    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    free_delivery_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    min_delivery_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)
    allowed_pincodes = models.TextField(blank=True, default="", help_text="Comma-separated list of allowed pincodes")"""

content = content.replace(old_delivery, new_delivery)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
