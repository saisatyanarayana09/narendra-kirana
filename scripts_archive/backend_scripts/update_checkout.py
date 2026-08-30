import os
import re

filepath = 'orders/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Wallet Lock
old_wallet_lock = """            try:
                wallet = request.user.wallet
                if wallet.balance > 0:"""

new_wallet_lock = """            try:
                from accounts.models import Wallet
                wallet = Wallet.objects.select_for_update().get(user=request.user)
                if wallet.balance > 0:"""

content = content.replace(old_wallet_lock, new_wallet_lock)


# 2. Record PromoUsage after order creation
old_promo_record = """        order = Order.objects.create(
            customer=request.user, 
            total_amount=total, 
            discount_applied=product_discount, 
            promo_discount=promo_discount,
            wallet_discount=wallet_discount,
            packaging_fee=packaging_fee,
            pickup_time=checkout.validated_data.get('pickup_time', ''),
            customer_note=checkout.validated_data.get('customer_note', ''),
            status=initial_status
        )
        
        from cart.serializers import current_price"""

new_promo_record = """        order = Order.objects.create(
            customer=request.user, 
            total_amount=total, 
            discount_applied=product_discount, 
            promo_discount=promo_discount,
            wallet_discount=wallet_discount,
            packaging_fee=packaging_fee,
            pickup_time=checkout.validated_data.get('pickup_time', ''),
            customer_note=checkout.validated_data.get('customer_note', ''),
            status=initial_status
        )
        
        # Record Promo Usage
        if cart.promo_code:
            try:
                from offers.models import PromoUsage
                PromoUsage.objects.create(promo_code=cart.promo_code, user=request.user)
            except Exception as e:
                print("Error recording promo usage:", e)
                
        # Clear cart promo code after successful checkout
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
        from cart.serializers import current_price"""

content = content.replace(old_promo_record, new_promo_record)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
