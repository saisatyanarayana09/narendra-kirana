import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client(SERVER_NAME='localhost')
try:
    response = c.get('/api/v1/store/homepage-sections/')
    if response.status_code != 200:
        print("STATUS:", response.status_code)
        print("DATA:", response.content.decode('utf-8')[:500])
    else:
        print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
