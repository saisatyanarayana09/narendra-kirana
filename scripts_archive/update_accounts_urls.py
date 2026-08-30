import re

filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("from .views import CustomTokenObtainPairView, CustomerSignupView, ProfileView", "from .views import CustomTokenObtainPairView, CustomerSignupView, ProfileView, VerifyEmailView")

route_addition = "    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),\n"
content = content.replace("urlpatterns = [", "urlpatterns = [\n" + route_addition)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
