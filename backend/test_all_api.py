import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client(SERVER_NAME='localhost')
for path in ['/api/v1/store/homepage-sections/', '/api/v1/products/', '/api/v1/offers/banners/', '/api/v1/store/settings/']:
    response = c.get(path)
    print(path, response.status_code)
