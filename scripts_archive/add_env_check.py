import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add EnvCheckView
new_view = '''
class EnvCheckView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        has_brevo = bool(os.environ.get('BREVO_API_KEY'))
        brevo_prefix = os.environ.get('BREVO_API_KEY', '')[:10] if has_brevo else None
        return Response({
            'has_brevo_key': has_brevo,
            'brevo_key_starts_with': brevo_prefix,
            'email_host_user': os.environ.get('EMAIL_HOST_USER', 'NOT SET'),
            'default_from_email': os.environ.get('DEFAULT_FROM_EMAIL', 'NOT SET')
        })
'''

content += new_view

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
