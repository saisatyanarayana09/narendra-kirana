import os
import re

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_view = '''class RequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        if hasattr(user, 'customer_profile'):
            user.customer_profile.delete_requested = True
            user.customer_profile.save()
            return Response({'message': 'Account deletion requested successfully.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Not a customer profile.'}, status=status.HTTP_400_BAD_REQUEST)'''

new_view = '''class RequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required to request deletion.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.check_password(password):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        if hasattr(user, 'customer_profile'):
            user.customer_profile.delete_requested = True
            user.customer_profile.save()
            return Response({'message': 'Account deletion requested successfully.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Not a customer profile.'}, status=status.HTTP_400_BAD_REQUEST)'''

content = content.replace(old_view, new_view)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
