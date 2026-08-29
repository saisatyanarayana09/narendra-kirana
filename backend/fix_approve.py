import os
import re

filepath = 'accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Revert my previous broken approve block and apply the correct one
old_approve_broken = """class ApproveDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                # Soft delete & Add deleted_ prefix to free up email/mobile for future but track them
                user.is_active = False
                user.username = f"deleted_{user.id}_{user.username}"[:150]
                user.email = f"deleted_{user.id}_{user.email}"[:254]
                user.customer_profile.delete_requested = False
                if user.customer_profile.mobile_number:
                    user.customer_profile.mobile_number = f"deleted_{user.id}_{user.customer_profile.mobile_number}"[:15]
                user.customer_profile.save()
                user.save()
                return Response({'message': 'Account successfully deactivated (soft deleted).'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)"""

new_approve = """class ApproveDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.is_active = False
                
                # Free up the email and mobile for future signups, but STORE the mobile in username for memory
                old_mobile = user.customer_profile.mobile_number or "none"
                user.username = f"del_{old_mobile}_{user.username}"[:150]
                user.email = f"del_{user.id}_{user.email}"[:254]
                
                user.customer_profile.mobile_number = None
                user.customer_profile.delete_requested = False
                
                user.customer_profile.save()
                user.save()
                return Response({'message': 'Account successfully deactivated (soft deleted).'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)"""

content = content.replace(old_approve_broken, new_approve)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
