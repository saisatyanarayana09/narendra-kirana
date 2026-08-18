import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from offers.models import Referral
from django.core.signing import TimestampSigner
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()
owner = User.objects.get(is_owner=True)

client = APIClient()
client.force_authenticate(user=owner)

referral = Referral.objects.first()
print(f"Initial status: {referral.status}")

signer = TimestampSigner()
token = signer.sign(str(referral.id))

response = client.post(f'/api/v1/offers/referrals/{referral.id}/approve/', {'token': token}, format='json')
print(f"Status Code: {response.status_code}")
print(f"Response: {response.data}")

referral.refresh_from_db()
print(f"Final status: {referral.status}")
