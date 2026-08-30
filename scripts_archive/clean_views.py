import os
import re

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the whole PasswordResetRequestView with the clean, pure SMTP version
pattern = r'class PasswordResetRequestView\(APIView\):.*?def post\(self, request\):.*?print\("SMTP failed:", str\(e\)\)\s+threading\.Thread\(target=send_reset_email\)\.start\(\)'

new_class = '''class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
            
            import threading
            from django.core.mail import send_mail
            def send_reset_email():
                try:
                    send_mail(
                        'Password Reset Request - Narendra Kirana',
                        f'You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}\\n\\nIf you did not request this, please ignore this email.',
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                        [user.email],
                        fail_silently=False,
                    )
                except Exception as e:
                    print("Email sending failed:", str(e))
            
            threading.Thread(target=send_reset_email).start()'''

content = re.sub(pattern, new_class, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
