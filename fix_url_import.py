import os

filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("from .views import PasswordResetRequestView", "from .views import TempResetLinkView, PasswordResetRequestView")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
