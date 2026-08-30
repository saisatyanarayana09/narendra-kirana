import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

imports = '''from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
'''

if 'urlsafe_base64_encode' not in content[:content.find('class PasswordResetRequestView')]:
    # prepend to file
    content = imports + content
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Imports added")
else:
    print("Imports already exist")
