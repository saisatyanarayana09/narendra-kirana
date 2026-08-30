import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

c = Client(SERVER_NAME='localhost')

# Test profile endpoint (requires auth, so we might just get 401, which is fine, but 500 is bad)
try:
    response = c.get('/api/v1/auth/profile/')
    print("PROFILE:", response.status_code, response.content[:100])
except Exception as e:
    import traceback
    print("PROFILE ERROR:")
    traceback.print_exc()

# Test signup endpoint
try:
    response = c.post('/api/v1/auth/signup/', {
        'first_name': 'Test',
        'email': 'test500@example.com',
        'mobile_number': '9999999999',
        'password': 'Password123!',
        'username': 'test500@example.com'
    })
    print("SIGNUP:", response.status_code, response.content[:200])
except Exception as e:
    import traceback
    print("SIGNUP ERROR:")
    traceback.print_exc()
