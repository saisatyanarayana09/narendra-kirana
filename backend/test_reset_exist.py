import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
# create a user if not exists
user, created = User.objects.get_or_create(email='exist@example.com', defaults={'username':'exist', 'password':'abc'})

c = Client(SERVER_NAME='localhost')
try:
    response = c.post('/api/v1/auth/password-reset/', {'email': 'exist@example.com'}, content_type='application/json')
    print("STATUS:", response.status_code)
    print("CONTENT:", response.content)
    if response.status_code == 500:
        html = response.content.decode('utf-8')
        import re
        match2 = re.search(r'Exception Value:(.*?)</pre>', html, re.DOTALL)
        if match2:
            print("EXCEPTION:", match2.group(1).strip())
except Exception as e:
    print(e)
