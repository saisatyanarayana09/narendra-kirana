import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client(SERVER_NAME='localhost')
response = c.post('/api/v1/auth/password-reset-confirm/', {'uid': 'abc', 'token': '123', 'new_password': 'test'}, content_type='application/json')
print("CONFIRM STATUS:", response.status_code)
if response.status_code == 500:
    html = response.content.decode('utf-8')
    import re
    match = re.search(r'<title>(.*?)</title>', html)
    if match: print("ERROR TITLE:", match.group(1))
