import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings

User = get_user_model()
email = "perali.narendra@gmail.com"
user = User.objects.filter(email__iexact=email).first()

if user:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://narendra-kirana.vercel.app')
    print(f"RESET LINK: {frontend_url}/reset-password?uid={uid}&token={token}")
else:
    print("USER NOT FOUND IN DB!")
