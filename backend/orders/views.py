from datetime import datetime
from decimal import Decimal
import logging
import threading
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import IsCustomerUser, IsOwnerUser
from cart.models import Cart
from products.models import Product
from store.models import StoreSettings
from notifications.models import Notification
from notifications.services import send_push_notification
from .models import Order, OrderItem
from .serializers import CheckoutSerializer, OrderSerializer, OrderStatusSerializer
from .utils import send_order_confirmation_email, send_final_invoice_email

logger = logging.getLogger(__name__)


def parse_time_str(val):
    if not val or not isinstance(val, str):
        return None
    val = val.strip().lower()
    for fmt in ('%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p'):
        try:
            return datetime.strptime(val, fmt).time()
        except ValueError:
            pass
    return None


def check_store_operating_hours(timings_json):
    """
    Checks whether store is open based on store_timings_json.
    Returns (is_open: bool, message: str)
    """
    if not timings_json:
        return True, ""

    now = timezone.localtime(timezone.now())
    day_name_full = now.strftime('%A').lower()   # e.g. "friday"
    day_name_short = now.strftime('%a').lower()  # e.g. "fri"
    weekday_idx_mon = str(now.weekday())         # 0=Monday .. 6=Sunday
    weekday_idx_sun = str((now.weekday() + 1) % 7) # 0=Sunday .. 6=Saturday

    target_keys = {day_name_full, day_name_short, weekday_idx_mon, weekday_idx_sun}

    day_config = None
    if isinstance(timings_json, dict):
        for k, v in timings_json.items():
            if str(k).strip().lower() in target_keys:
                day_config = v
                break
    elif isinstance(timings_json, list):
        for item in timings_json:
            if isinstance(item, dict):
                item_day = str(item.get('day') or item.get('day_name') or item.get('name') or item.get('id', '')).strip().lower()
                if item_day in target_keys:
                    day_config = item
                    break

    if day_config is None:
        return True, ""

    if isinstance(day_config, bool):
        if not day_config:
            return False, f"The store is closed on {now.strftime('%A')}s."
        return True, ""

    if isinstance(day_config, str):
        if day_config.strip().lower() in ('closed', 'off'):
            return False, f"The store is closed on {now.strftime('%A')}s."
        return True, ""

    if isinstance(day_config, dict):
        if day_config.get('is_closed') is True or day_config.get('closed') is True:
            return False, f"The store is closed on {now.strftime('%A')}s."
        if day_config.get('is_open') is False or day_config.get('open') is False:
            return False, f"The store is closed on {now.strftime('%A')}s."

        open_str = (
            day_config.get('open_time')
            or day_config.get('open')
            or day_config.get('opening_time')
            or day_config.get('from')
            or day_config.get('start_time')
        )
        close_str = (
            day_config.get('close_time')
            or day_config.get('close')
            or day_config.get('closing_time')
            or day_config.get('to')
            or day_config.get('end_time')
        )

        if open_str and close_str:
            t_open = parse_time_str(str(open_str))
            t_close = parse_time_str(str(close_str))
            if t_open and t_close:
                curr_t = now.time()
                if t_open <= t_close:
                    if not (t_open <= curr_t <= t_close):
                        return False, f"Store is currently closed. Today's operating hours are {open_str} - {close_str}."
                else: # Overnight hours
                    if not (curr_t >= t_open or curr_t <= t_close):
                        return False, f"Store is currently closed. Today's operating hours are {open_str} - {close_str}."

    return True, ""


class OrderPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 50

class OrderViewSet(ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    pagination_class = OrderPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['id']

    def get_permissions(self):
        if self.action == 'status':
            return [IsOwnerUser()]
        if self.action == 'create':
            return [IsAuthenticated(), IsCustomerUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = Order.objects.select_related(
            'customer',
            'customer__customer_profile',
            'delivery_partner',
            'delivery_partner__delivery_profile'
        ).prefetch_related(
            'items',
            'items__product'
        ).order_by('-created_at')
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
        if not checkout.is_valid():
            errors = checkout.errors
            first_val = next(iter(errors.values())) if errors else 'Invalid checkout data.'
            first_err = first_val[0] if isinstance(first_val, list) and first_val else str(first_val)
            return Response({'detail': first_err, 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Pre-lock validations (Store status, timings, and slot limits)
        settings = StoreSettings.load()
        if not settings.is_open:
            return Response({'detail': 'Sorry, the store is currently closed and not accepting new orders.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check Emergency Pause
        if getattr(settings, 'is_emergency_paused', False):
            pause_message = getattr(settings, 'emergency_pause_message', '') or "We are currently experiencing high order volume and will resume shortly. Thank you for your patience!"
            return Response({'detail': pause_message}, status=status.HTTP_400_BAD_REQUEST)

        # Check Store Timings & Operating Hours Cutoff
        if getattr(settings, 'auto_cutoff_orders', False) and getattr(settings, 'store_timings_json', None):
            is_open_schedule, schedule_msg = check_store_operating_hours(settings.store_timings_json)
            if not is_open_schedule:
                return Response({'detail': schedule_msg or 'The store is currently closed outside of operating hours.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check Delivery / Pickup Time Slot Capacity
        chosen_slot_date = checkout.validated_data.get('delivery_slot_date')
        chosen_slot_label = (checkout.validated_data.get('delivery_slot_label') or '').strip()
        if getattr(settings, 'enable_time_slots', False) and chosen_slot_date and chosen_slot_label:
            max_slot_cap = getattr(settings, 'max_orders_per_slot', 15) or 15
            active_slot_orders = Order.objects.filter(
                delivery_slot_date=chosen_slot_date,
                delivery_slot_label=chosen_slot_label
            ).exclude(status__in=[Order.Status.REJECTED]).count()
            if active_slot_orders >= max_slot_cap:
                return Response({
                    'detail': f'The selected time slot "{chosen_slot_label}" on {chosen_slot_date} is fully booked ({active_slot_orders}/{max_slot_cap} orders). Please choose another slot.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Acquire locks deterministically
        try:
            cart = Cart.objects.select_for_update().get(customer=request.user)
        except Cart.DoesNotExist:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
        items = list(cart.items.select_for_update().select_related('product'))
        if not items:
            return Response({'detail': 'Your cart is empty.'}, status=status.HTTP_400_BAD_REQUEST)
            
        product_ids = sorted([item.product_id for item in items if item.product_id])
        locked_products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=product_ids).order_by('id')}
        for item in items:
            product = locked_products.get(item.product_id)
            if not product or not product.is_in_stock or (product.stock_quantity is not None and item.quantity > product.stock_quantity):
                return Response({'detail': f'Insufficient stock for {item.product_name_snapshot or getattr(product, "name", "product")}.'}, status=400)
            if product.max_order_quantity and product.max_order_quantity > 0 and item.quantity > product.max_order_quantity:
                return Response({'detail': f'Order exceeds maximum order limit of {product.max_order_quantity} for {item.product_name_snapshot or getattr(product, "name", "product")}.'}, status=400)

        from cart.serializers import CartSerializer
        cart_data = CartSerializer(cart).data
            
        items_total = Decimal(str(cart_data.get('items_total', cart_data['subtotal'])))
        subtotal = items_total
        if subtotal < settings.min_order_amount:
            return Response({'detail': f'Minimum order amount is Rs. {settings.min_order_amount}.'}, status=status.HTTP_400_BAD_REQUEST)

        # Delivery Validation & Fees
        order_type = checkout.validated_data.get('order_type', 'PICKUP')
        delivery_address = checkout.validated_data.get('delivery_address', '')
        delivery_pincode = checkout.validated_data.get('delivery_pincode', '').strip()
        delivery_latitude = checkout.validated_data.get('delivery_latitude')
        delivery_longitude = checkout.validated_data.get('delivery_longitude')
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

            # Geofence Delivery Radius Enforcement
            if getattr(settings, 'enforce_delivery_radius', False):
                if delivery_latitude is not None and delivery_longitude is not None:
                    store_lat = getattr(settings, 'store_latitude', None)
                    store_lng = getattr(settings, 'store_longitude', None)
                    max_radius = getattr(settings, 'delivery_radius_km', None)
                    if store_lat and store_lng and max_radius:
                        from math import radians, cos, sin, asin, sqrt
                        try:
                            lat1, lon1 = radians(float(store_lat)), radians(float(store_lng))
                            lat2, lon2 = radians(float(delivery_latitude)), radians(float(delivery_longitude))
                            dlon = lon2 - lon1
                            dlat = lat2 - lat1
                            a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
                            c = 2 * asin(sqrt(a))
                            distance_km = 6371 * c
                            if distance_km > float(max_radius):
                                return Response({
                                    'detail': f'Selected address is {distance_km:.1f} km away, which exceeds our maximum delivery radius of {float(max_radius):.1f} km.'
                                }, status=status.HTTP_400_BAD_REQUEST)
                        except Exception as e:
                            logger.warning(f"Error calculating delivery distance: {e}")
                    
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
        
        wallet_discount = Decimal('0.00')
        if checkout.validated_data.get('use_wallet', False):
            from accounts.models import Wallet, WalletTransaction
            wallet, _ = Wallet.objects.select_for_update().get_or_create(user=request.user)
            if wallet.balance > 0 and total > 0:
                max_pct = getattr(settings, 'max_wallet_usage_percentage', 100)
                if max_pct is not None and max_pct >= 0:
                    max_allowable_wallet = ((total * Decimal(str(max_pct))) / Decimal('100')).quantize(Decimal('0.01'))
                else:
                    max_allowable_wallet = total

                spendable_amount = min(wallet.balance, total, max_allowable_wallet).quantize(Decimal('0.01'))
                if spendable_amount > Decimal('0.00'):
                    wallet_discount = spendable_amount
                    total -= wallet_discount
                    wallet.balance -= wallet_discount
                    wallet.save(update_fields=['balance', 'updated_at'])
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=-wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.PURCHASE_DEDUCTION,
                        description="Used for order checkout"
                    )

        initial_status = Order.Status.ACCEPTED if settings.auto_accept_orders else Order.Status.NEW

        delivery_otp = ""
        if order_type == 'DELIVERY':
            from django.utils.crypto import get_random_string
            delivery_otp = get_random_string(4, allowed_chars='0123456789')

        order = Order.objects.create(
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
            delivery_latitude=delivery_latitude,
            delivery_longitude=delivery_longitude,
            delivery_fee=delivery_fee,
            delivery_slot_date=checkout.validated_data.get('delivery_slot_date'),
            delivery_slot_label=checkout.validated_data.get('delivery_slot_label', ''),
            payment_method=checkout.validated_data.get('payment_method', 'COD'),
            upi_transaction_id=checkout.validated_data.get('upi_transaction_id', ''),
            delivery_otp=delivery_otp
        )
        
        # Record Promo Usage
        if cart.promo_code:
            try:
                from offers.models import PromoUsage
                PromoUsage.objects.create(promo_code=cart.promo_code, user=request.user)
            except Exception as e:
                logger.error("Error recording promo usage: %s", e)
                
        # Clear cart promo code after successful checkout
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
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
        Product.objects.bulk_update(products_to_update, ['stock_quantity', 'is_in_stock'])

        cart.items.all().delete()
        cart.promo_code = None
        cart.save(update_fields=['promo_code'])
        
        # Dispatch notifications and email asynchronously post-commit to minimize lock hold time
        def on_commit_tasks():
            try:
                Notification.objects.create(
                    user=request.user,
                    title=created_title,
                    message=created_msg
                )
                send_push_notification(
                    user=request.user,
                    title=created_title,
                    body=created_msg,
                    data={'order_id': str(order.id), 'status': order.status, 'type': 'ORDER_PLACED'}
                )
                from accounts.models import User
                for owner in User.objects.filter(is_owner=True, is_active=True):
                    send_push_notification(
                        user=owner,
                        title=f"New Order #{order.id} Received! 🛒",
                        body=f"New order for ₹{order.total_amount} placed by {request.user.get_full_name() or request.user.username}.",
                        data={'order_id': str(order.id), 'type': 'NEW_ORDER'}
                    )
            except Exception as e:
                logger.error("Error dispatching post-order notifications: %s", e)

            threading.Thread(target=send_order_confirmation_email, args=(order,), daemon=True).start()

            # Real-time WebSocket push alert to store owner live feed
            try:
                from .ws_broadcast import broadcast_order_created
                cust_name = request.user.get_full_name() or request.user.username
                cust_phone = getattr(getattr(request.user, 'customer_profile', None), 'phone_number', '')
                broadcast_order_created(order, cust_name, cust_phone, order.items.count())
            except Exception as ws_err:
                logger.debug("WS order creation broadcast error: %s", ws_err)

        created_title = f"Order #{order.id} Placed Successfully! 🎉"
        created_msg = f"Hi {request.user.first_name or 'there'}, thank you for your purchase! We've received your order and will start processing it shortly."
        transaction.on_commit(on_commit_tasks)
        
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
            Order.Status.READY: {Order.Status.OUT_FOR_DELIVERY, Order.Status.COMPLETED, Order.Status.REJECTED},
            Order.Status.OUT_FOR_DELIVERY: {Order.Status.COMPLETED, Order.Status.REJECTED},
        }
        next_status = serializer.validated_data['status']
        if next_status == order.status:
            return Response(OrderSerializer(order).data) # Silently succeed if already in this state
            
        if next_status not in allowed.get(order.status, set()):
            return Response({'detail': f'Cannot change {order.status} to {next_status}.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            order.status = next_status
            order.save(update_fields=['status', 'updated_at'])

            if next_status == Order.Status.ACCEPTED:
                accept_title = f"Order #{order.id} Accepted! 🛍️"
                accept_body = f"Your order #{order.id} has been accepted by Narendra Kirana and is being processed."
                Notification.objects.create(
                    user=order.customer,
                    title=accept_title,
                    message=accept_body
                )
                send_push_notification(
                    user=order.customer,
                    title=accept_title,
                    body=accept_body,
                    data={'order_id': str(order.id), 'status': 'ACCEPTED'}
                )

            elif next_status == Order.Status.PREPARING:
                prep_title = f"Order #{order.id} Being Packed! 📦"
                prep_body = f"Your grocery items for order #{order.id} are being packed fresh and carefully."
                Notification.objects.create(
                    user=order.customer,
                    title=prep_title,
                    message=prep_body
                )
                send_push_notification(
                    user=order.customer,
                    title=prep_title,
                    body=prep_body,
                    data={'order_id': str(order.id), 'status': 'PREPARING'}
                )

            elif next_status == Order.Status.READY:
                ready_title = f"Order #{order.id} Ready! 🛍️"
                if order.order_type == 'DELIVERY':
                    ready_body = f"Your order #{order.id} is packed and waiting for delivery partner pickup."
                else:
                    ready_body = f"Your order #{order.id} is ready for pickup at Narendra Kirana Store!"
                Notification.objects.create(
                    user=order.customer,
                    title=ready_title,
                    message=ready_body
                )
                send_push_notification(
                    user=order.customer,
                    title=ready_title,
                    body=ready_body,
                    data={'order_id': str(order.id), 'status': 'READY'}
                )

            elif next_status == Order.Status.OUT_FOR_DELIVERY:
                order.dispatched_at = timezone.now()
                order.save(update_fields=['dispatched_at', 'updated_at'])
                out_title = f"Order #{order.id} is Out for Delivery! 🛵"
                out_body = f"Your order is on the way! Your delivery verification OTP is {order.delivery_otp}."
                Notification.objects.create(
                    user=order.customer,
                    title=out_title,
                    message=out_body
                )
                send_push_notification(
                    user=order.customer,
                    title=out_title,
                    body=out_body,
                    data={'order_id': str(order.id), 'status': 'OUT_FOR_DELIVERY', 'otp': order.delivery_otp or ''}
                )

            elif next_status == Order.Status.COMPLETED:
                order.delivered_at = timezone.now()
                order.save(update_fields=['delivered_at', 'updated_at'])
                if order.delivery_partner and hasattr(order.delivery_partner, 'delivery_profile'):
                    try:
                        order.delivery_partner.delivery_profile.total_deliveries += 1
                        order.delivery_partner.delivery_profile.save(update_fields=['total_deliveries'])
                    except Exception:
                        pass

                comp_title = f"Order #{order.id} Delivered! 🎉"
                comp_body = f"Hi {order.customer.first_name or 'there'}, your order has been successfully delivered/picked up. Thank you for shopping with us!"
                Notification.objects.create(
                    user=order.customer,
                    title=comp_title,
                    message=comp_body
                )
                send_push_notification(
                    user=order.customer,
                    title=comp_title,
                    body=comp_body,
                    data={'order_id': str(order.id), 'status': 'COMPLETED'}
                )
                
                # Order Cashback Processing (Strictly Idempotent)
                store_settings = StoreSettings.load()
                cashback_pct = getattr(store_settings, 'order_cashback_percentage', Decimal('0.00'))
                if not getattr(order, 'cashback_credited', False) and cashback_pct and Decimal(str(cashback_pct)) > Decimal('0.00') and order.total_amount > Decimal('0.00'):
                    cashback = ((order.total_amount * Decimal(str(cashback_pct))) / Decimal('100')).quantize(Decimal('0.01'))
                    if cashback > Decimal('0.00'):
                        try:
                            from accounts.models import Wallet, WalletTransaction
                            customer_wallet, _ = Wallet.objects.select_for_update().get_or_create(user=order.customer)
                            customer_wallet.balance += cashback
                            customer_wallet.save(update_fields=['balance', 'updated_at'])

                            WalletTransaction.objects.create(
                                wallet=customer_wallet,
                                amount=cashback,
                                transaction_type='PURCHASE_CASHBACK',
                                description=f"Cashback for completed order #{order.id} ({cashback_pct}%)"
                            )

                            order.cashback_credited = True
                            order.save(update_fields=['cashback_credited', 'updated_at'])

                            Notification.objects.create(
                                user=order.customer,
                                title="Cashback Earned! 💰",
                                message=f"You earned ₹{cashback} cashback on your Order #{order.id}! Added to your wallet."
                            )
                        except Exception as e:
                            logger.error("Error crediting cashback for order %s: %s", order.id, str(e))

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
                    logger.error("Error processing referral reward: %s", str(e))
                
                # Send final PDF invoice asynchronously
                threading.Thread(target=send_final_invoice_email, args=(order,), daemon=True).start()
                
            elif next_status == Order.Status.REJECTED:
                # Restore inventory
                for item in order.items.exclude(status='REJECTED').select_related('product'):
                    if item.product:
                        item.product.stock_quantity += item.quantity
                        if item.product.stock_quantity > 0:
                            item.product.is_in_stock = True
                        item.product.save(update_fields=['stock_quantity', 'is_in_stock'])
                    
                if order.wallet_discount > 0:
                    from accounts.models import Wallet, WalletTransaction
                    wallet = Wallet.objects.select_for_update().get(user=order.customer)
                    Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + order.wallet_discount)
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=order.wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                        description=f"Refund for cancelled order #{order.id}"
                    )
                        
                rej_title = f"Order #{order.id} Cancelled"
                rej_body = f"Hi {order.customer.first_name or 'there'}, unfortunately we had to cancel your order. Please contact the store for more details."
                Notification.objects.create(
                    user=order.customer,
                    title=rej_title,
                    message=rej_body
                )
                send_push_notification(
                    user=order.customer,
                    title=rej_title,
                    body=rej_body,
                    data={'order_id': str(order.id), 'status': 'REJECTED'}
                )

        # Real-time WebSocket status broadcast to customer and store owner
        try:
            from .ws_broadcast import broadcast_order_status, broadcast_order_ready_dispatch
            broadcast_order_status(order.id, next_status, order.delivery_otp)
            if next_status == Order.Status.READY:
                broadcast_order_ready_dispatch(order)
        except Exception as ws_err:
            logger.debug("WS status broadcast error: %s", ws_err)
                
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerUser])
    def owner_note(self, request, pk=None):
        order = self.get_object()
        note = request.data.get('owner_note', '')
        order.owner_note = note
        order.save(update_fields=['owner_note', 'updated_at'])
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def assign_partner(self, request, pk=None):
        order = self.get_object()
        partner_id = request.data.get('delivery_partner_id')

        if not partner_id:
            order.delivery_partner = None
            order.assigned_at = None
            order.save(update_fields=['delivery_partner', 'assigned_at', 'updated_at'])
            return Response(OrderSerializer(order, context=self.get_serializer_context()).data)

        from accounts.models import User
        partner = User.objects.filter(id=partner_id, is_delivery_partner=True, is_active=True).first()
        if not partner:
            return Response({'detail': 'Selected delivery partner was not found or is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        order.delivery_partner = partner
        order.assigned_at = timezone.now()
        if not order.delivery_otp:
            from django.utils.crypto import get_random_string
            order.delivery_otp = get_random_string(4, allowed_chars='0123456789')

        if order.status in [Order.Status.ACCEPTED, Order.Status.PREPARING]:
            order.status = Order.Status.READY

        order.save(update_fields=['delivery_partner', 'assigned_at', 'delivery_otp', 'status', 'updated_at'])

        try:
            partner_title = f"New Delivery Assigned! 🛵 Order #{order.id}"
            partner_msg = f"You have been assigned to deliver order #{order.id} to {order.delivery_address or 'Customer'}."
            Notification.objects.create(
                user=partner,
                title=partner_title,
                message=partner_msg
            )
            send_push_notification(
                user=partner,
                title=partner_title,
                body=partner_msg,
                data={'order_id': str(order.id), 'type': 'DELIVERY_ASSIGNED'}
            )

            # Notify customer that delivery partner is assigned
            cust_title = f"Delivery Partner Assigned! 🛵"
            cust_msg = f"{partner.get_full_name() or partner.username} has been assigned to deliver your order #{order.id}."
            Notification.objects.create(
                user=order.customer,
                title=cust_title,
                message=cust_msg
            )
            send_push_notification(
                user=order.customer,
                title=cust_title,
                body=cust_msg,
                data={'order_id': str(order.id), 'status': 'PARTNER_ASSIGNED', 'type': 'DELIVERY_UPDATE'}
            )
        except Exception as e:
            logger.error("Failed to notify delivery partner/customer: %s", e)

        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)


    @action(detail=True, methods=['post'], permission_classes=[IsOwnerUser])
    def reject_item(self, request, pk=None):
        order = self.get_object()
        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'detail': 'item_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if order.status not in [Order.Status.NEW, Order.Status.ACCEPTED, Order.Status.PREPARING]:
            return Response({'detail': f'Cannot reject items on order with status {order.status}.'}, status=400)
            
        try:
            item = order.items.get(id=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Item not found in this order.'}, status=status.HTTP_404_NOT_FOUND)
            
        if item.status == 'REJECTED':
            return Response({'detail': 'Item is already rejected.'}, status=status.HTTP_400_BAD_REQUEST)
            
        with transaction.atomic():
            item.status = 'REJECTED'
            item.save(update_fields=['status'])
            
            from accounts.models import Wallet, WalletTransaction
            gross_subtotal = sum(i.subtotal for i in order.items.all())
            wallet_ratio = (order.wallet_discount / gross_subtotal) if gross_subtotal > 0 else Decimal('0.00')
            item_wallet_refund = (item.subtotal * wallet_ratio).quantize(Decimal('0.01'))
            if item_wallet_refund > 0:
                order.wallet_discount -= item_wallet_refund
                wallet = Wallet.objects.select_for_update().get(user=order.customer)
                Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + item_wallet_refund)
                WalletTransaction.objects.create(
                    wallet=wallet,
                    amount=item_wallet_refund,
                    transaction_type=WalletTransaction.TransactionType.CREDIT,
                    description=f"Refund for rejected {item.product_name_snapshot} in order #{order.id}"
                )

            payable_deduction = item.subtotal - item_wallet_refund
            order.total_amount = max(Decimal('0.00'), order.total_amount - payable_deduction)
            
            # Restore inventory for the rejected item
            if item.product:
                item.product.stock_quantity += item.quantity
                if item.product.stock_quantity > 0:
                    item.product.is_in_stock = True
                item.product.save(update_fields=['stock_quantity', 'is_in_stock'])
            
            # If ALL items are now rejected, reject the entire order
            all_rejected = not order.items.exclude(status='REJECTED').exists()
            if all_rejected:
                order.status = Order.Status.REJECTED
                order.total_amount = Decimal('0.00')
                order.delivery_fee = Decimal('0.00')
                order.packaging_fee = Decimal('0.00')
                
                # Refund any remaining wallet discount
                if order.wallet_discount > 0:
                    wallet = Wallet.objects.select_for_update().get(user=order.customer)
                    Wallet.objects.filter(id=wallet.id).update(balance=F('balance') + order.wallet_discount)
                    WalletTransaction.objects.create(
                        wallet=wallet,
                        amount=order.wallet_discount,
                        transaction_type=WalletTransaction.TransactionType.REFUND,
                        description=f"Refund for fully rejected order #{order.id}"
                    )
                    order.wallet_discount = Decimal('0.00')
                
                order.save(update_fields=['status', 'total_amount', 'delivery_fee', 'packaging_fee', 'wallet_discount', 'updated_at'])
                
                Notification.objects.create(
                    user=order.customer,
                    title=f"Order #{order.id} Cancelled",
                    message=f"Hi {order.customer.first_name}, all items in your order were unavailable so the order has been cancelled. Any wallet balance used has been refunded."
                )
            else:
                order.save(update_fields=['total_amount', 'wallet_discount', 'updated_at'])
                
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
