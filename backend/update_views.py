import os

filepath = 'accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_views = '''
class RequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        if hasattr(user, 'customer_profile'):
            user.customer_profile.delete_requested = True
            user.customer_profile.save()
            return Response({'message': 'Account deletion requested successfully.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Not a customer profile.'}, status=status.HTTP_400_BAD_REQUEST)

class ApproveDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.delete()
                return Response({'message': 'Account successfully deleted.'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

class RejectDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.customer_profile.delete_requested = False
                user.customer_profile.save()
                return Response({'message': 'Account deletion request rejected.'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
'''

# Add to the end of the file
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content + "\n" + new_views)
