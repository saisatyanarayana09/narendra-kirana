import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find the PasswordResetRequestView class and replace its post method entirely
pattern = r'class PasswordResetRequestView\(APIView\):.*?def post\(self, request\):.*?return Response\(\{.*?\}, status=status\.HTTP_200_OK\)'

new_class = '''class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'message': 'DEBUG ERROR: This email does not exist in the database!'}, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
        
        import urllib.request
        import json
        import os
        
        brevo_api_key = os.environ.get('BREVO_API_KEY')
        if not brevo_api_key:
            return Response({'message': 'DEBUG ERROR: BREVO_API_KEY is completely missing from Render Environment Variables!'}, status=status.HTTP_200_OK)
            
        sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'saisatyanarayana2004@gmail.com'
        
        try:
            req = urllib.request.Request('https://api.brevo.com/v3/smtp/email', method='POST')
            req.add_header('api-key', brevo_api_key)
            req.add_header('Accept', 'application/json')
            req.add_header('Content-Type', 'application/json')
            req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
            
            data = json.dumps({
                "sender": {"name": "Narendra Kirana", "email": sender_email},
                "to": [{"email": user.email}],
                "subject": 'Password Reset Request - Narendra Kirana',
                "textContent": f'You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}'
            }).encode('utf-8')
            
            with urllib.request.urlopen(req, data=data, timeout=10) as response:
                return Response({'message': 'SUCCESS: Email has been sent to your inbox!'}, status=status.HTTP_200_OK)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            return Response({'message': f'DEBUG BREVO API REJECTED IT: {err_body}'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'message': f'DEBUG SERVER CRASH: {str(e)}'}, status=status.HTTP_200_OK)'''

content = re.sub(pattern, new_class, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
