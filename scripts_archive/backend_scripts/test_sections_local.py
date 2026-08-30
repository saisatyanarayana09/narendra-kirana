import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client()
response = c.get('/api/v1/store/homepage-sections/')
if response.status_code != 200:
    print(f"ERROR {response.status_code}: {response.content.decode('utf-8')}")
else:
    print("SUCCESS")
