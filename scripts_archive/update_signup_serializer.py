import re

filepath = 'backend/accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
        validated_data['is_customer'] = True
        validated_data['is_owner'] = False
        
        user = User.objects.create(**validated_data)
        user.is_active = False
        user.set_password(password)
        user.save()

        # Send Activation Email
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        from .utils import email_verification_token
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:5173'
        verify_link = f"{frontend_url}/verify-email?uid={uid}&token={token}"
        
        try:
            send_mail(
                'Activate Your Narendra Kirana Account',
                f'Welcome to Narendra Kirana!\\n\\nPlease click the link below to activate your account:\\n{verify_link}',
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            print("Email sending failed:", str(e))
'''

# We need to replace the section starting at alidated_data['is_customer'] = True up to user.save()
pattern = r"\s*validated_data\['is_customer'\] = True\s*validated_data\['is_owner'\] = False\s*user = User\.objects\.create\(\*\*validated_data\)\s*user\.set_password\(password\)\s*user\.save\(\)"

content = re.sub(pattern, replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
