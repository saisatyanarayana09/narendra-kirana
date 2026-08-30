import os
import re

filepath = 'accounts/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add delete_requested field to CustomerProfile
if 'delete_requested' not in content:
    content = content.replace(
        "referral_code = models.CharField(max_length=20, unique=True, null=True, blank=True)",
        "referral_code = models.CharField(max_length=20, unique=True, null=True, blank=True)\n    delete_requested = models.BooleanField(default=False)"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
