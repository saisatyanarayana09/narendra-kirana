import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace exact email match with case-insensitive match
content = content.replace(
    "user = User.objects.filter(email=email).first()",
    "user = User.objects.filter(email__iexact=email).first()"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
