import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from store.models import StoreSettings

client = APIClient()
owner = User.objects.filter(is_owner=True).first()

if owner:
    client.force_authenticate(user=owner)
    
    data = {
        'store_name': 'Kirana Store',
        'is_open': True,
        'min_order_amount': '15.00',
        'packaging_fee': '5.00',
        'low_stock_threshold': 10,
        'delivery_mode': 'BOTH',
        'delivery_fee': '20.00',
        'free_delivery_threshold': '200.00',
        'auto_accept_orders': True,
        'id': 1
    }
    response = client.patch('/api/v1/store/settings/', data, format='json')
    print("STATUS:", response.status_code)
    if response.status_code != 200:
        print("DATA:", response.json())
    else:
        print("SUCCESS")
else:
    print("No owner found")
