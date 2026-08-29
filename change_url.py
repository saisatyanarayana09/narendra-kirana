import os

filepath = 'backend/accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset')", "path('reset-password-request/', PasswordResetRequestView.as_view(), name='password-reset')")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
