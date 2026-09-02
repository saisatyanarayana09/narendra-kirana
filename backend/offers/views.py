from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from accounts.permissions import IsOwnerUser
from .models import Banner, PromoCode
from .serializers import BannerSerializer, PromoCodeSerializer

class BannerViewSet(viewsets.ModelViewSet):
    serializer_class = BannerSerializer
    
    def get_queryset(self):
        qs = Banner.objects.all().order_by('display_order', '-created_at')
        if getattr(self.request.user, 'is_owner', False):
            return qs
        return qs.filter(is_active=True)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerUser])
    def reorder(self, request):
        updates = request.data
        banners = []
        for update in updates:
            b = Banner(id=update['id'], display_order=update['display_order'])
            banners.append(b)
        Banner.objects.bulk_update(banners, ['display_order'])
        return Response({'status': 'reordered'})

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsOwnerUser()]

class PromoCodeViewSet(viewsets.ModelViewSet):
    queryset = PromoCode.objects.all().order_by('-created_at')
    serializer_class = PromoCodeSerializer
    permission_classes = [IsOwnerUser]

from .models import ReferralSettings, ReferralMilestone, Referral
from .serializers import ReferralSettingsSerializer, ReferralMilestoneSerializer, ReferralSerializer
from rest_framework import generics

class ReferralSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = ReferralSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return ReferralSettings.load()

class ReferralMilestoneViewSet(viewsets.ModelViewSet):
    queryset = ReferralMilestone.objects.all().order_by('required_referrals')
    serializer_class = ReferralMilestoneSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsOwnerUser()]

class ReferralHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ReferralSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'is_owner', False):
            return Referral.objects.all()
        return Referral.objects.filter(referrer=self.request.user)

    @action(detail=True, methods=['get'])
    def qr_code(self, request, pk=None):
        referral = self.get_object()
        if referral.referrer != request.user and not getattr(request.user, 'is_owner', False):
            return Response({'detail': 'Not authorized.'}, status=403)
            
        from django.core.signing import TimestampSigner
        signer = TimestampSigner()
        token = signer.sign(str(referral.id))
        
        import qrcode
        import base64
        from io import BytesIO
        
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(f"secure_qr:{token}")
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return Response({'qr_code_base64': img_str})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def claim(self, request, pk=None):
        referral = self.get_object()
        if referral.referrer != request.user:
            return Response({'detail': 'Not authorized.'}, status=403)
        if referral.status != Referral.Status.READY_TO_CLAIM:
            return Response({'detail': 'Referral not ready to claim.'}, status=400)
            
        referral.status = Referral.Status.AWAITING_APPROVAL
        referral.save()
        return Response({'status': 'claimed'})

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def approve(self, request, pk=None):
        token = request.data.get('token')
        is_owner = request.user and request.user.is_authenticated and getattr(request.user, 'is_owner', False)
        if not token and not is_owner:
            return Response({'detail': 'Security token is missing from the request!'}, status=400)
            
        if token:
            from django.core.signing import TimestampSigner, SignatureExpired, BadSignature
            signer = TimestampSigner()
            try:
                # Valid for exactly 5 minutes (300 seconds)
                verified_id = signer.unsign(token, max_age=300)
                if str(verified_id) != str(pk):
                    return Response({'detail': 'Token mismatch error!'}, status=400)
            except SignatureExpired:
                return Response({'detail': 'QR Code has expired! Please ask the customer to refresh their screen.'}, status=400)
            except BadSignature:
                return Response({'detail': 'Invalid or tampered QR Code!'}, status=400)

        from django.utils import timezone
        from decimal import Decimal
        from orders.models import Order, OrderItem
        from accounts.models import Wallet, WalletTransaction
        from notifications.models import Notification

        settings = ReferralSettings.load()
        with transaction.atomic():
            try:
                referral = Referral.objects.select_for_update().get(id=pk)
            except Referral.DoesNotExist:
                return Response({'detail': 'Referral not found.'}, status=404)

            if referral.status != Referral.Status.AWAITING_APPROVAL:
                return Response({'detail': 'Referral not awaiting approval.'}, status=400)

            referral.status = Referral.Status.COMPLETED
            referral.completed_at = timezone.now()
            referral.save()
            
            referrer_wallet = Wallet.objects.select_for_update().get(user=referral.referrer)

            if settings.referrer_reward > 0:
                referrer_wallet.balance += settings.referrer_reward
                referrer_wallet.save()
                WalletTransaction.objects.create(
                    wallet=referrer_wallet,
                    amount=settings.referrer_reward,
                    transaction_type=WalletTransaction.TransactionType.REFERRAL_REWARD,
                    description=f"Reward for successful referral of {referral.referred_user.username}"
                )
                
            if settings.referrer_reward_product:
                from products.models import Product
                product = Product.objects.select_for_update().get(id=settings.referrer_reward_product_id)
                product_price = product.offer_price if product.offer_price else product.regular_price
                free_order = Order.objects.create(
                    customer=referral.referrer,
                    total_amount=Decimal('0.00'),
                    discount_applied=product_price,
                    promo_discount=Decimal('0.00'),
                    wallet_discount=Decimal('0.00'),
                    packaging_fee=Decimal('0.00'),
                    status=Order.Status.ACCEPTED,
                    customer_note=f"Free gift for referring {referral.referred_user.username}!"
                )
                OrderItem.objects.create(
                    order=free_order,
                    product=product,
                    product_name_snapshot=product.name,
                    unit_snapshot=product.unit,
                    price_snapshot=Decimal('0.00'),
                    quantity=1,
                    subtotal=Decimal('0.00')
                )
                product.stock_quantity -= 1
                if product.stock_quantity <= 0:
                    product.stock_quantity = 0
                    product.is_in_stock = False
                product.save(update_fields=['stock_quantity', 'is_in_stock'])
                
            successful_referrals = Referral.objects.filter(referrer=referral.referrer, status=Referral.Status.COMPLETED).count()
            milestone = ReferralMilestone.objects.filter(required_referrals=successful_referrals).first()
            if milestone and milestone.bonus_reward > 0:
                referrer_wallet.balance += milestone.bonus_reward
                referrer_wallet.save()
                WalletTransaction.objects.create(
                    wallet=referrer_wallet,
                    amount=milestone.bonus_reward,
                    transaction_type=WalletTransaction.TransactionType.MILESTONE_BONUS,
                    description=f"Bonus for reaching {successful_referrals} referrals!"
                )
                
            Notification.objects.create(
                user=referral.referrer,
                title="Referral Reward Approved! 🎉",
                message="Your referral reward has been approved by the store owner and issued to you!"
            )
            
        return Response({'status': 'approved'})
