import os

filepath = 'backend/accounts/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_address = """    country = models.CharField(max_length=100, default="India")
    zip_code = models.CharField(max_length=20, verbose_name="Pincode")
    is_default = models.BooleanField(default=False)"""

new_address = """    country = models.CharField(max_length=100, default="India")
    zip_code = models.CharField(max_length=20, verbose_name="Pincode")
    is_default = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)"""

content = content.replace(old_address, new_address)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
