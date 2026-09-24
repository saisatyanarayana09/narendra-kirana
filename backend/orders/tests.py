from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from store.models import StoreSettings
from store.serializers import StoreSettingsSerializer
from products.models import Category, Product
from cart.models import Cart, CartItem
from accounts.models import Wallet, WalletTransaction
from orders.models import Order
from orders.serializers import OrderSerializer, CheckoutSerializer
from orders.views import OrderViewSet

User = get_user_model()


class StoreSettingsAndOrderFeaturesTest(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username='9876543210',
            email='customer@example.com',
            first_name='John',
            last_name='Doe',
            is_customer=True,
            is_owner=False
        )
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            first_name='Owner',
            last_name='Kirana',
            is_customer=False,
            is_owner=True
        )
        self.category = Category.objects.create(name="Groceries")
        self.product = Product.objects.create(
            category=self.category,
            name="Basmati Rice",
            unit="1 kg",
            regular_price=Decimal("100.00"),
            offer_price=Decimal("90.00"),
            stock_quantity=50,
            is_in_stock=True
        )
        self.cart = Cart.objects.create(customer=self.user)
        self.cart_item = CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)

    def test_store_settings_all_fields_exist(self):
        settings = StoreSettings.load()
        # UPI
        self.assertEqual(settings.upi_id, "")
        self.assertEqual(settings.upi_payee_name, "Narendra Kirana")
        self.assertTrue(settings.enable_dynamic_upi_qr)
        # Compliance
        self.assertEqual(settings.fssai_license_number, "")
        self.assertEqual(settings.gstin, "")
        self.assertTrue(settings.enable_itemized_tax_invoice)
        self.assertIn("Goods once sold", settings.invoice_terms_and_conditions)
        # Store Timings & Emergency Pause
        self.assertEqual(settings.store_timings_json, {})
        self.assertTrue(settings.auto_cutoff_orders)
        self.assertFalse(settings.is_emergency_paused)
        self.assertIn("high order volume", settings.emergency_pause_message)
        # Delivery & Pickup Time Slots
        self.assertTrue(settings.enable_time_slots)
        self.assertEqual(settings.preparation_buffer_minutes, 30)
        self.assertEqual(settings.max_orders_per_slot, 15)
        self.assertEqual(settings.time_slots_json, [])
        # WhatsApp Support
        self.assertTrue(settings.enable_whatsapp_support)
        self.assertEqual(settings.whatsapp_number, "+919876543210")
        # Loyalty Wallet & Referral Rules
        self.assertEqual(settings.referral_bonus_referrer, Decimal("50.00"))
        self.assertEqual(settings.referral_bonus_referee, Decimal("50.00"))
        self.assertEqual(settings.referral_min_order_amount, Decimal("200.00"))
        self.assertEqual(settings.max_wallet_usage_percentage, 50)
        self.assertEqual(settings.order_cashback_percentage, Decimal("2.00"))
        # Announcement & Festive Popup
        self.assertTrue(settings.enable_announcement_bar)
        self.assertFalse(settings.enable_festive_popup)
        # Mobile Version & Maintenance
        self.assertEqual(settings.min_mobile_version, "1.0.0")
        self.assertEqual(settings.latest_mobile_version, "1.0.0")
        self.assertFalse(settings.is_maintenance_mode)

    def test_store_settings_serializer_image_sanitization(self):
        serializer = StoreSettingsSerializer()
        data = {
            'store_name': 'Test Store',
            'upi_qr_image': 'http://example.com/media/upi_qr/old.jpg',
            'festive_popup_image': None,
            'invoice_signature': 'http://example.com/media/signatures/sig.png',
        }
        cleaned = serializer.to_internal_value(data)
        self.assertNotIn('upi_qr_image', cleaned)
        self.assertNotIn('festive_popup_image', cleaned)
        self.assertNotIn('invoice_signature', cleaned)

    def test_order_model_and_serializers_have_new_fields(self):
        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("180.00"),
            delivery_slot_date=date(2026, 9, 5),
            delivery_slot_label="10:00 AM - 12:00 PM",
            payment_method="UPI",
            upi_transaction_id="UPI1234567890"
        )
        self.assertEqual(order.delivery_slot_label, "10:00 AM - 12:00 PM")
        self.assertEqual(order.payment_method, "UPI")
        self.assertEqual(order.upi_transaction_id, "UPI1234567890")

        serializer = OrderSerializer(order)
        for f in ['delivery_slot_date', 'delivery_slot_label', 'payment_method', 'upi_transaction_id']:
            self.assertIn(f, serializer.data)
            self.assertIn(f, OrderSerializer.Meta.read_only_fields)

        checkout_s = CheckoutSerializer(data={
            'delivery_slot_date': '2026-09-05',
            'delivery_slot_label': '10:00 AM - 12:00 PM',
            'payment_method': 'UPI',
            'upi_transaction_id': 'UPI1234567890'
        })
        self.assertTrue(checkout_s.is_valid(), checkout_s.errors)

    def test_emergency_pause_blocks_order_creation(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = True
        settings.emergency_pause_message = "Currently overloaded. Back in 30 mins!"
        settings.save()

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {'order_type': 'PICKUP'}, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("Currently overloaded", response.data['detail'])

    def test_store_timings_cutoff_blocks_when_closed(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = False
        settings.auto_cutoff_orders = True
        # Set today as closed
        now = timezone.localtime(timezone.now())
        day_name = now.strftime('%A').lower()
        settings.store_timings_json = {
            day_name: {"is_open": False}
        }
        settings.save()

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {'order_type': 'PICKUP'}, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 400)
        self.assertIn("closed", response.data['detail'].lower())

    def test_max_wallet_usage_percentage_cap(self):
        settings = StoreSettings.load()
        settings.is_emergency_paused = False
        settings.auto_cutoff_orders = False
        settings.max_wallet_usage_percentage = 40  # 40% cap
        settings.save()

        # 2 items * 90 = 180 total
        wallet = Wallet.objects.create(user=self.user, balance=Decimal("150.00"))

        view = OrderViewSet.as_view({'post': 'create'})
        request = self.factory.post('/api/orders/', {
            'order_type': 'PICKUP',
            'use_wallet': True,
            'delivery_slot_date': '2026-09-06',
            'delivery_slot_label': '2:00 PM - 4:00 PM',
            'payment_method': 'COD'
        }, format='json')
        force_authenticate(request, user=self.user)
        response = view(request)

        self.assertEqual(response.status_code, 201)
        created_order = Order.objects.get(id=response.data['id'])
        # 40% of 180 = 72.00 max wallet usage
        self.assertEqual(created_order.wallet_discount, Decimal("72.00"))
        self.assertEqual(created_order.total_amount, Decimal("108.00"))
        wallet.refresh_from_db()
        self.assertEqual(wallet.balance, Decimal("78.00"))
        self.assertEqual(created_order.delivery_slot_label, "2:00 PM - 4:00 PM")

    def test_cashback_credited_on_completed_status(self):
        settings = StoreSettings.load()
        settings.order_cashback_percentage = Decimal("5.00")  # 5%
        settings.save()

        wallet = Wallet.objects.create(user=self.user, balance=Decimal("10.00"))
        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("200.00"),
            status=Order.Status.READY
        )

        view = OrderViewSet.as_view({'patch': 'status'})
        request = self.factory.patch(f'/api/orders/{order.id}/status/', {'status': Order.Status.COMPLETED}, format='json')
        force_authenticate(request, user=self.owner)
        response = view(request, pk=order.id)

        self.assertEqual(response.status_code, 200)
        wallet.refresh_from_db()
        # 5% of 200 = 10.00 cashback; 10 + 10 = 20.00
        self.assertEqual(wallet.balance, Decimal("20.00"))
        tx = WalletTransaction.objects.filter(wallet=wallet, transaction_type='PURCHASE_CASHBACK').first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal("10.00"))

    def test_invoice_templates_render_fssai_gstin_and_terms(self):
        settings = StoreSettings.load()
        settings.fssai_license_number = "12345678901234"
        settings.gstin = "29ABCDE1234F1Z5"
        settings.invoice_terms_and_conditions = "Custom terms line 1.\nCustom terms line 2."
        settings.save()

        order = Order.objects.create(
            customer=self.user,
            total_amount=Decimal("180.00"),
            status=Order.Status.COMPLETED
        )

        pdf_html = render_to_string('store/invoice_pdf.html', {
            'order': order,
            'items': [],
            'subtotal': Decimal("180.00"),
            'discount_applied': Decimal("0.00"),
            'settings': settings,
            'store_settings': settings,
        })
        self.assertIn("12345678901234", pdf_html)
        self.assertIn("29ABCDE1234F1Z5", pdf_html)
        self.assertIn("Custom terms line 1.", pdf_html)

        email_html = render_to_string('store/invoice_email.html', {
            'order': order,
            'items': [],
            'subtotal': Decimal("180.00"),
            'discount_applied': Decimal("0.00"),
            'settings': settings,
            'store_settings': settings,
            'invoice_link': 'http://localhost:5173/orders/test/invoice',
        })
        self.assertIn("12345678901234", email_html)
        self.assertIn("29ABCDE1234F1Z5", email_html)
        self.assertIn("Custom terms line 1.", email_html)
