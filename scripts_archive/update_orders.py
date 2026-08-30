import os
import re

filepath = 'backend/orders/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"delivery_pincode = models\.CharField\(max_length=20, blank=True\)"
replacement = "delivery_pincode = models.CharField(max_length=20, blank=True)\n    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)\n    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)"

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced!")
else:
    print("Pattern not found!")
