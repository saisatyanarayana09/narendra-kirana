import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client()
try:
    response = c.get('/api/v1/store/homepage-sections/')
    print(response.status_code)
except Exception as e:
    import traceback
    traceback.print_exc()
