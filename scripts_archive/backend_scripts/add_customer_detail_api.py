import os

filepath = 'accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_view = '''
from orders.models import Order
from django.db.models import Sum

class OwnerCustomerDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def get(self, request, pk):
        try:
            customer_user = User.objects.get(pk=pk, is_customer=True)
            
            # 1. Base User Info
            serializer = UserSerializer(customer_user)
            data = serializer.data
            
            # 2. Wallet Balance
            wallet_balance = 0
            if hasattr(customer_user, 'wallet'):
                wallet_balance = float(customer_user.wallet.balance)
                
            # 3. Aggregated Sales (only non-rejected orders)
            orders = Order.objects.filter(customer=customer_user).exclude(status='REJECTED')
            total_orders = orders.count()
            total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
            
            # 4. Recent Orders
            recent_orders = orders.order_by('-created_at')[:5]
            recent_orders_data = [{
                'id': order.id,
                'created_at': order.created_at,
                'status': order.status,
                'total_amount': float(order.total_amount)
            } for order in recent_orders]
            
            # Append aggregated data
            data['wallet_balance'] = wallet_balance
            data['total_orders'] = total_orders
            data['total_spent'] = float(total_spent)
            data['recent_orders'] = recent_orders_data
            
            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content + "\n" + new_view)
