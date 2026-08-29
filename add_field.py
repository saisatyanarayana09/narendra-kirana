import os
import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_settings = """    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)"""

new_settings = """    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    is_home_delivery_active = models.BooleanField(default=False)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)"""

content = content.replace(old_settings, new_settings)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
