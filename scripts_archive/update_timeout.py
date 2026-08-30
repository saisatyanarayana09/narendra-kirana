import os

filepath = 'backend/config/settings.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'PASSWORD_RESET_TIMEOUT' not in content:
    content += '\n# Password Reset Link Expiration (10 minutes = 600 seconds)\nPASSWORD_RESET_TIMEOUT = 600\n'

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
