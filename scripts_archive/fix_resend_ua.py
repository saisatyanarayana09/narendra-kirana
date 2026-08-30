import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "req = urllib.request.Request('https://api.resend.com/emails', method='POST')",
    "req = urllib.request.Request('https://api.resend.com/emails', method='POST')\n                        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
