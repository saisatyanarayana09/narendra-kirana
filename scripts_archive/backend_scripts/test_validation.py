import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from accounts.serializers import AddressSerializer

data = {
    "title": "Test",
    "street": "123 Main",
    "city": "Vizag",
    "state": "AP",
    "zip_code": "530001",
    "latitude": 17.68681598765432,
    "longitude": 83.21848151234567
}

serializer = AddressSerializer(data=data)
if not serializer.is_valid():
    print("Validation Error:", serializer.errors)
else:
    print("Valid!")
