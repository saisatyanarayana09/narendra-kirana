import os
import re

filepath = 'backend/orders/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'from cart\.serializers import CartSerializer\s+cart_data = CartSerializer\(cart\)\.data.*?wallet_discount = Decimal\(\'0\.00\'\)'

new_checkout = """from cart.serializers import CartSerializer
        cart_data = CartSerializer(cart).data
        
        settings = StoreSettings.load()
        if not settings.is_open:
            return Response({'detail': 'Sorry, the store is currently closed and not accepting new orders.'}, status=status.HTTP_400_BAD_REQUEST)
            
        subtotal = Decimal(str(cart_data['subtotal']))
        if subtotal < settings.min_order_amount:
            return Response({'detail': f'Minimum order amount is Rs. {settings.min_order_amount}.'}, status=status.HTTP_400_BAD_REQUEST)

        # Delivery Validation & Fees
        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_fee = Decimal('0.00')
        
        if order_type == 'DELIVERY':
            if not getattr(settings, 'is_home_delivery_active', False):
                return Response({'detail': 'Home delivery is currently unavailable.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if not delivery_address:
                return Response({'detail': 'Delivery address is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            min_delivery = getattr(settings, 'min_delivery_order_amount', 0)
            if min_delivery > 0 and subtotal < min_delivery:
                return Response({'detail': f'Minimum order amount for delivery is ₹{min_delivery}.'}, status=status.HTTP_400_BAD_REQUEST)
                
            allowed_pincodes_str = getattr(settings, 'allowed_pincodes', '')
            if allowed_pincodes_str:
                allowed_pincodes = [p.strip() for p in allowed_pincodes_str.split(',') if p.strip()]
                if allowed_pincodes and delivery_pincode not in allowed_pincodes:
                    return Response({'detail': f'Sorry, we do not deliver to pincode {delivery_pincode}.'}, status=status.HTTP_400_BAD_REQUEST)
                    
            free_threshold = getattr(settings, 'free_delivery_threshold', 0)
            if free_threshold > 0 and subtotal >= free_threshold:
                delivery_fee = Decimal('0.00')
            else:
                delivery_fee = Decimal(str(getattr(settings, 'delivery_fee', '0.00')))

        # Calculate total precisely
        total = Decimal(str(cart_data['total'])) + delivery_fee
        
        # Base discount is from product offer prices
        product_discount = Decimal(str(cart_data['discount']))
        promo_discount = Decimal(str(cart_data.get('promo_discount', 0)))
        packaging_fee = Decimal(str(cart_data['packaging_fee']))
        
        wallet_discount = Decimal('0.00')"""

content = re.sub(pattern, new_checkout, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
