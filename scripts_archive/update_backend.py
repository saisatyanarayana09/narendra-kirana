import os
import re

filepath = 'backend/orders/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """        next_status = serializer.validated_data['status']
        if next_status not in allowed.get(order.status, set()):
            return Response({'detail': f'Cannot change {order.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():"""

new_logic = """        next_status = serializer.validated_data['status']
        if next_status == order.status:
            return Response(OrderSerializer(order).data) # Silently succeed if already in this state
            
        if next_status not in allowed.get(order.status, set()):
            return Response({'detail': f'Cannot change {order.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
