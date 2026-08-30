import os

filepath = 'frontend/src/ForgotPassword.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("api.post('/auth/password-reset/'", "api.post('/auth/reset-password-request/'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
