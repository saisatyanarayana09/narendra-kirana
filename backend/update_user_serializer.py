import os
import re

filepath = 'accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_customer', 'is_owner', 'customer_profile', 'password', 'profile_picture']",
    "fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_customer', 'is_owner', 'customer_profile', 'password', 'profile_picture', 'is_active']"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
