from decimal import Decimal
from django.db import transaction
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from accounts.permissions import IsCustomerUser, IsOwnerUser
from cart.models import Cart
from .models import Order, OrderItem
from store.models import StoreSettings
from .serializers import CheckoutSerializer, OrderSerializer, OrderStatusSerializer
from notifications.models import Notification
import threading
from .utils import send_order_confirmation_email, send_final_invoice_email


class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        print("ACTION CALLED:", self.action)
        if self.action == 'status':
            return [IsOwnerUser()]
        if self.action == 'create':
            return [IsAuthenticated(), IsCustomerUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Order.objects.select_related('customer').prefetch_related('items').all()
        if self.request.user.is_owner:
            return queryset
        return queryset.filter(customer=self.request.user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Prevent order spamming
        from rest_framework.throttling import UserRateThrottle
        throttle = UserRateThrottle()
        if not throttle.allow_request(request, self):
            return Response({'detail': 'You are creating orders too quickly. Please wait a minute.'}, status=429)
            
        checkout = CheckoutSerializer(data=request.data)
        checkout.is_valid(raise_exception=True)
        try:
            cart = Cart.objects.select_for_update().get(customer=request.user)
        except Cart.DoesNotExist:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        items = list(cart.items.select_for_update().select_related('product'))
        if not items:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
            
        unavailable = [item.product.name for item in items if not item.product.is_active or not item.product.is_in_stock]
        if unavailable:
            return Response({'detail': f"Unavailable products: {', '.join(unavailable)}"}, status=status.HTTP_400_BAD_REQUEST)
            
        insufficient_stock = [item.product.name for item in items if item.quantity > item.product.stock_quantity]
        if insufficient_stock:
            return Response({'detail': f"Insufficient stock for: {', '.join(insufficient_stock)}"}, status=status.HTTP_400_BAD_REQUEST)

        from cart.serializers import CartSerializer
        cart_data = CartSerializer(cart).data
        total = Decimal(str(cart_data['total']))
        
        settings = StoreSettings.load()
        if not settings.is_open:
            return Response({'detail': 'Sorry, the store is currently closed and not accepting new orders.'}, status=status.HTTP_400_BAD_REQUEST)
            
        subtotal = Decimal(str(cart_data['subtotal']))
        if subtotal < settings.min_order_amount:
            return Response({'detail': f'Minimum order amount is Rs. {settings.min_order_amount}.'}, status=status.HTTP_400_BAD_REQUEST)

        # Base discount is from product offer prices
        product_discount = Decimal(str(cart_data['discount']))
        promo_discount = Decimal(str(cart_data['promo_discount']))
        packaging_fee = Decimal(str(cart_data['packaging_fee']))
        
        wallet_discount = Decimal('0.00')
        if checkout.validated_data.get('use_wallet', False):
            try:
                wallet = request.user.wallet
                if wallet.balance > 0:
                    if wallet.balance >= total:
                        wallet_discount = total
                        total = Decimal('0.00')
                        wallet.balance -= wallet_discount
                    else:
                        wallet_discount = wallet.balance
                        total -= wallet_discount
                        wallet.balance = Decimal('0.00')
                    wallet.save()
                    from accounts.models import WalletTransaction
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=-wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.PURCHASE_DEDUCTION,
                        description="Used for order checkout"
                    )
            except Exception as e:
                print("Wallet error:", e)

        initial_status = Order.Status.ACCEPTED if settings.auto_accept_orders else Order.Status.NEW

        order = Order.objects.create(
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
        
        from cart.serializers import current_price
        order_items_to_create = []
        products_to_update = []
        
        for item in items:
            order_items_to_create.append(OrderItem(
                order=order, 
                product=item.product, 
                product_name_snapshot=item.product.name, 
                unit_snapshot=item.product.unit, 
                price_snapshot=current_price(item.product), 
                quantity=item.quantity, 
                subtotal=current_price(item.product) * item.quantity
            ))
            
            # Deduct stock
            item.product.stock_quantity -= item.quantity
            if item.product.stock_quantity <= 0:
                item.product.stock_quantity = 0
                item.product.is_in_stock = False
            products_to_update.append(item.product)
            
        OrderItem.objects.bulk_create(order_items_to_create)
        
        from products.models import Product
        Product.objects.bulk_update(products_to_update, ['stock_quantity', 'is_in_stock'])

        cart.items.all().delete()
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
        Notification.objects.create(
            user=request.user,
            title=f"Order #{order.id} Placed Successfully! 🎉",
            message=f"Hi {request.user.first_name}, thank you for your purchase! We've received your order and will start processing it shortly."
        )
        
        # Dispatch email asynchronously but ONLY after the transaction commits
        def send_email_task():
            threading.Thread(target=send_order_confirmation_email, args=(order,), daemon=True).start()
        
        transaction.on_commit(send_email_task)
        
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerUser])
    def status(self, request, pk=None):
        order = self.get_object()
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        allowed = {
            Order.Status.NEW: {Order.Status.ACCEPTED, Order.Status.REJECTED},
            Order.Status.ACCEPTED: {Order.Status.PREPARING, Order.Status.REJECTED},
            Order.Status.PREPARING: {Order.Status.READY, Order.Status.REJECTED},
            Order.Status.READY: {Order.Status.COMPLETED},
        }
        next_status = serializer.validated_data['status']
        if next_status not in allowed.get(order.status, set()):
            return Response({'detail': f'Cannot change {order.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = next_status
            order.save(update_fields=['status', 'updated_at'])
            
            if next_status == Order.Status.COMPLETED:
                Notification.objects.create(
                    user=order.customer,
                    title=f"Order #{order.id} Completed! 🎉",
                    message=f"Hi {order.customer.first_name}, your order has been successfully delivered/picked up. We hope you enjoy your purchase and see you again soon!"
                )
                
                # Referral Processing
                try:
                    from offers.models import Referral, ReferralSettings, ReferralMilestone
                    from accounts.models import WalletTransaction
                    settings = ReferralSettings.load()
                    if settings.is_active:
                        pending_referral = Referral.objects.filter(referred_user=order.customer, status=Referral.Status.PENDING).first()
                        if pending_referral:
                            pending_referral.status = Referral.Status.READY_TO_CLAIM
                            pending_referral.save()
                            
                            Notification.objects.create(
                                user=pending_referral.referrer,
                                title="Referral Reward Ready! 🎁",
                                message=f"Your friend {order.customer.first_name} completed their first order. Click here to claim your reward!"
                            )
                except Exception as e:
                    print("Error processing referral reward:", str(e))
                
                # Send final PDF invoice asynchronously
                threading.Thread(target=send_final_invoice_email, args=(order,), daemon=True).start()
                
            elif next_status == Order.Status.REJECTED:
                # Restore inventory
                products_to_update = []
                for item in order.items.select_related('product'):
                    if item.product:
                        item.product.stock_quantity += item.quantity
                        item.product.is_in_stock = True
                        products_to_update.append(item.product)
                
                if products_to_update:
                    from products.models import Product
                    Product.objects.bulk_update(products_to_update, ['stock_quantity', 'is_in_stock'])
                    
                if order.wallet_discount > 0:
                    try:
                        wallet = order.customer.wallet
                        wallet.balance += order.wallet_discount
                        wallet.save()
                        from accounts.models import WalletTransaction
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            amount=order.wallet_discount,
                            transaction_type=WalletTransaction.TransactionType.REFUND,
                            description=f"Refund for cancelled order #{order.id}"
                        )
                    except Exception as e:
                        print("Error refunding wallet:", e)
                        
                Notification.objects.create(
                    user=order.customer,
                    title=f"Order #{order.id} Cancelled",
                    message=f"Hi {order.customer.first_name}, unfortunately we had to cancel your order. Please contact the store for more details."
                )
                
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerUser])
    def owner_note(self, request, pk=None):
        order = self.get_object()
        note = request.data.get('owner_note', '')
        order.owner_note = note
        order.save(update_fields=['owner_note', 'updated_at'])
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def reject_item(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'detail': 'item_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            item = order.items.get(id=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found in this order.'}, status=status.HTTP_404_NOT_FOUND)
            
        if item.status == 'REJECTED':
            return Response({'detail': 'Item is already rejected.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            item.status = 'REJECTED'
            item.save(update_fields=['status'])
            
            # Recalculate total amount
            order.total_amount -= item.subtotal
            if order.total_amount < 0:
                refund_amount = abs(order.total_amount)
                order.total_amount = Decimal('0.00')
                if order.wallet_discount > 0:
                    try:
                        refund_to_wallet = min(refund_amount, order.wallet_discount)
                        order.wallet_discount -= refund_to_wallet
                        wallet = order.customer.wallet
                        wallet.balance += refund_to_wallet
                        wallet.save()
                        from accounts.models import WalletTransaction
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            amount=refund_to_wallet,
                            transaction_type=WalletTransaction.TransactionType.REFUND,
                            description=f"Partial refund for rejected item in order #{order.id}"
                        )
                    except Exception as e:
                        print("Error in partial refund:", e)
                        
            order.save(update_fields=['total_amount', 'wallet_discount', 'updated_at'])
            
            # Restore inventory for the rejected item
            if item.product:
                item.product.stock_quantity += item.quantity
                item.product.is_in_stock = True
                item.product.save(update_fields=['stock_quantity', 'is_in_stock'])
            
            # If ALL items are now rejected, reject the entire order
            all_rejected = not order.items.exclude(status='REJECTED').exists()
            if all_rejected:
                order.status = Order.Status.REJECTED
                order.save(update_fields=['status', 'updated_at'])
                
                # Refund any remaining wallet discount
                if order.wallet_discount > 0:
                    try:
                        wallet = order.customer.wallet
                        wallet.balance += order.wallet_discount
                        wallet.save()
                        from accounts.models import WalletTransaction
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            amount=order.wallet_discount,
                            transaction_type=WalletTransaction.TransactionType.REFUND,
                            description=f"Refund for fully rejected order #{order.id}"
                        )
                        order.wallet_discount = Decimal('0.00')
                        order.save(update_fields=['wallet_discount'])
                    except Exception as e:
                        print("Error refunding wallet on full rejection:", e)
                
                Notification.objects.create(
                    user=order.customer,
                    title=f"Order #{order.id} Cancelled",
                    message=f"Hi {order.customer.first_name}, all items in your order were unavailable so the order has been cancelled. Any wallet balance used has been refunded."
                )
                
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['get'], permission_classes=[IsOwnerUser])
    def analytics(self, request):
        from django.core.cache import cache
        cached = cache.get('owner_analytics')
        if cached:
            return Response(cached)

        from django.utils import timezone
        from django.db.models import Sum
        from datetime import timedelta

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Calculate start dates
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        year_start = today_start.replace(month=1, day=1)

        qs = Order.objects.exclude(status=Order.Status.REJECTED)

        today_sales = qs.filter(created_at__gte=today_start).aggregate(total=Sum('total_amount'))['total'] or 0
        weekly_sales = qs.filter(created_at__gte=week_start).aggregate(total=Sum('total_amount'))['total'] or 0
        monthly_sales = qs.filter(created_at__gte=month_start).aggregate(total=Sum('total_amount'))['total'] or 0
        yearly_sales = qs.filter(created_at__gte=year_start).aggregate(total=Sum('total_amount'))['total'] or 0

        # Daily sales for the chart (last 7 days)
        last_7_days = [(today_start - timedelta(days=i)) for i in range(7)]
        last_7_days.reverse()
        chart_data = []
        for d in last_7_days:
            day_end = d + timedelta(days=1)
            day_sales = qs.filter(created_at__gte=d, created_at__lt=day_end).aggregate(total=Sum('total_amount'))['total'] or 0
            chart_data.append({
                'name': f"{d.day} {d.strftime('%b')}",
                'Sales': day_sales
            })

        data = {
            'today_sales': today_sales,
            'weekly_sales': weekly_sales,
            'monthly_sales': monthly_sales,
            'yearly_sales': yearly_sales,
            'chart_data': chart_data
        }
        cache.set('owner_analytics', data, timeout=60)
        return Response(data)
