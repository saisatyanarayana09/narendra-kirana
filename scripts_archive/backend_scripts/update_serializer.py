import os
import re

filepath = 'accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "fields = ['mobile_number', 'pickup_preference', 'dob', 'profile_picture', 'referral_code']",
    "fields = ['mobile_number', 'pickup_preference', 'dob', 'profile_picture', 'referral_code', 'delete_requested']"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
