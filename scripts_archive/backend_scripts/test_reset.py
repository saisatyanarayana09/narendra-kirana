import os
import django
from django.test import Client
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client()
try:
    response = c.post('/api/v1/auth/password-reset/', {'email': 'test@example.com'}, content_type='application/json')
    print("STATUS:", response.status_code)
    print("CONTENT:", response.content)
except Exception as e:
    import traceback
    traceback.print_exc()
