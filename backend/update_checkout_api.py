import os
import re

filepath = 'orders/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_checkout = """        cart_data = CartSerializer(cart, context={'request': request}).data
        
        # Calculate total precisely
        total = Decimal(str(cart_data['total']))
        
        # Base discount is from product offer prices
        product_discount = Decimal(str(cart_data['discount']))
        promo_discount = Decimal(str(cart_data['promo_discount']))
        packaging_fee = Decimal(str(cart_data['packaging_fee']))
        
        wallet_discount = Decimal('0.00')"""

new_checkout = """        cart_data = CartSerializer(cart, context={'request': request}).data
        
        # Delivery Validation & Fees
        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_fee = Decimal('0.00')
        
        if order_type == 'DELIVERY':
            store_settings = StoreSettings.load()
            if not getattr(store_settings, 'is_home_delivery_active', False):
                return Response({'detail': 'Home delivery is currently unavailable.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if not delivery_address:
                return Response({'detail': 'Delivery address is required.'}, status=status.HTTP_400_BAD_REQUEST)
                
            subtotal = Decimal(str(cart_data['subtotal']))
            if store_settings.min_delivery_order_amount > 0 and subtotal < store_settings.min_delivery_order_amount:
                return Response({'detail': f'Minimum order amount for delivery is ₹{store_settings.min_delivery_order_amount}.'}, status=status.HTTP_400_BAD_REQUEST)
                
            if store_settings.allowed_pincodes:
                allowed_pincodes = [p.strip() for p in store_settings.allowed_pincodes.split(',') if p.strip()]
                if allowed_pincodes and delivery_pincode not in allowed_pincodes:
                    return Response({'detail': f'Sorry, we do not deliver to pincode {delivery_pincode}.'}, status=status.HTTP_400_BAD_REQUEST)
                    
            if store_settings.free_delivery_threshold > 0 and subtotal >= store_settings.free_delivery_threshold:
                delivery_fee = Decimal('0.00')
            else:
                delivery_fee = Decimal(str(store_settings.delivery_fee))

        # Calculate total precisely
        total = Decimal(str(cart_data['total'])) + delivery_fee
        
        # Base discount is from product offer prices
        product_discount = Decimal(str(cart_data['discount']))
        promo_discount = Decimal(str(cart_data['promo_discount']))
        packaging_fee = Decimal(str(cart_data['packaging_fee']))
        
        wallet_discount = Decimal('0.00')"""

content = content.replace(old_checkout, new_checkout)

old_order_create = """        order = Order.objects.create(
            customer=request.user, 
            total_amount=total, 
            discount_applied=product_discount, 
            promo_discount=promo_discount,
            wallet_discount=wallet_discount,
            packaging_fee=packaging_fee,
            pickup_time=checkout.validated_data.get('pickup_time', ''),
            customer_note=checkout.validated_data.get('customer_note', ''),
            status=initial_status
        )"""

new_order_create = """        order = Order.objects.create(
            customer=request.user, 
            total_amount=total, 
            discount_applied=product_discount, 
            promo_discount=promo_discount,
            wallet_discount=wallet_discount,
            packaging_fee=packaging_fee,
            pickup_time=checkout.validated_data.get('pickup_time', ''),
            customer_note=checkout.validated_data.get('customer_note', ''),
            status=initial_status,
            order_type=order_type,
            delivery_address=delivery_address,
            delivery_pincode=delivery_pincode,
            delivery_fee=delivery_fee
        )"""

content = content.replace(old_order_create, new_order_create)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
