filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
content = content.replace("from .views import ", "from .views import PasswordResetRequestView, PasswordResetConfirmView, ")

# Add routes
routes = "    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),\n    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),\n"
content = content.replace("urlpatterns = [\n", "urlpatterns = [\n" + routes)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
