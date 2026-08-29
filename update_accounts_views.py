import re

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_view = '''

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .utils import email_verification_token

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        
        if not uidb64 or not token:
            return Response({'error': 'Missing parameters.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and email_verification_token.check_token(user, token):
            if user.is_active:
                return Response({'message': 'Account is already active.'}, status=status.HTTP_200_OK)
            user.is_active = True
            user.save()
            return Response({'message': 'Account activated successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Activation link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)
'''

content += new_view

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
