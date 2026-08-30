import os

filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'TempResetLinkView' not in content:
    content = content.replace("from .views import (", "from .views import (TempResetLinkView, ")
    content = content.replace("urlpatterns = [", "urlpatterns = [\n    path('get-reset-link/', TempResetLinkView.as_view()),")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
