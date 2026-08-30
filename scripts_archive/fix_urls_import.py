import re

filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if "VerifyEmailView" not in content[:content.find('urlpatterns')]:
    content = content.replace("from .views import ", "from .views import VerifyEmailView, ")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
