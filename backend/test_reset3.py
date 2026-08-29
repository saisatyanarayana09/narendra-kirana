import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client(SERVER_NAME='localhost')
try:
    response = c.post('/api/v1/auth/password-reset/', {'email': 'test@example.com'}, content_type='application/json')
    if response.status_code == 500:
        html = response.content.decode('utf-8')
        import re
        match = re.search(r'<title>(.*?)</title>', html)
        if match:
            print("ERROR TITLE:", match.group(1))
        
        match2 = re.search(r'Exception Value:(.*?)</pre>', html, re.DOTALL)
        if match2:
            print("EXCEPTION VALUE:", match2.group(1).strip())
    else:
        print("STATUS:", response.status_code)
        print("CONTENT:", response.content)
except Exception as e:
    print(e)
