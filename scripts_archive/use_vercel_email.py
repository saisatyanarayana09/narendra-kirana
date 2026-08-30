import os
import re

filepath = 'backend/config/settings.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the email backend
content = re.sub(r"EMAIL_BACKEND = 'django\.core\.mail\.backends\.smtp\.EmailBackend'", "EMAIL_BACKEND = 'accounts.vercel_email_backend.VercelHTTPSBackend'", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
