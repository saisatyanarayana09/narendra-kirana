import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client()
try:
    response = c.post('/api/v1/auth/password-reset/', {'email': 'test@example.com'}, content_type='application/json')
    if response.status_code == 500:
        html = response.content.decode('utf-8')
        # Extract the exception string
        import re
        match = re.search(r'<title>(.*?)</title>', html)
        if match:
            print("ERROR TITLE:", match.group(1))
        
        match2 = re.search(r'Exception Value:.*?<pre>(.*?)</pre>', html, re.DOTALL)
        if match2:
            print("EXCEPTION VALUE:", match2.group(1))
    else:
        print("STATUS:", response.status_code)
except Exception as e:
    print(e)
