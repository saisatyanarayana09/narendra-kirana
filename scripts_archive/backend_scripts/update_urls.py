import os
import re

filepath = 'accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure to import the new views
content = content.replace(
    "from .views import PasswordResetRequestView",
    "from .views import RequestDeleteView, ApproveDeleteView, RejectDeleteView, PasswordResetRequestView"
)

# Add routes
new_routes = '''
    path('request-delete/', RequestDeleteView.as_view(), name='request-delete'),
    path('customers/<int:user_id>/approve-delete/', ApproveDeleteView.as_view(), name='approve-delete'),
    path('customers/<int:user_id>/reject-delete/', RejectDeleteView.as_view(), name='reject-delete'),
'''

# insert routes before password-reset
content = content.replace("    path('password-reset/',", new_routes + "\n    path('password-reset/',")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
