import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.serializers import AddressSerializer

data = {
    "title": "Home",
    "street": "Test Street",
    "landmark": "",
    "city": "Test City",
    "state": "Test State",
    "country": "India",
    "zip_code": "123456",
    "latitude": 17.686816,
    "longitude": 83.218482
}

serializer = AddressSerializer(data=data)
if not serializer.is_valid():
    print("Validation Error:", serializer.errors)
else:
    print("Valid!")
