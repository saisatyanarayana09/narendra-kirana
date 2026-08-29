import os

filepath = 'cart/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_promo_check = """        if promo.expiration_date and promo.expiration_date < timezone.now():
            return Response({'detail': 'This promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # We attach it now. The CartSerializer will check if it meets min_order_amount"""

new_promo_check = """        if promo.expiration_date and promo.expiration_date < timezone.now():
            return Response({'detail': 'This promo code has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check usage limits
        if getattr(promo, 'max_uses_per_user', 0) > 0:
            from offers.models import PromoUsage
            usage_count = PromoUsage.objects.filter(promo_code=promo, user=request.user).count()
            if usage_count >= promo.max_uses_per_user:
                return Response({'detail': f'You have reached the maximum usage limit ({promo.max_uses_per_user}) for this promo code.'}, status=status.HTTP_400_BAD_REQUEST)

        # We attach it now. The CartSerializer will check if it meets min_order_amount"""

content = content.replace(old_promo_check, new_promo_check)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
