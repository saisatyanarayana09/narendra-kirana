from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.testing import WebsocketCommunicator
from config.asgi import application
from orders.models import Order

User = get_user_model()


class WebSocketIntegrationTests(TestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username='9876543210',
            email='cust@example.com',
            first_name='Ramesh',
            is_customer=True
        )
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            first_name='Owner',
            is_owner=True
        )
        self.order = Order.objects.create(
            customer=self.customer,
            total_amount=Decimal('250.00'),
            order_type='DELIVERY',
            delivery_address='Flat 101, Test Residency',
            delivery_otp='1234'
        )
        self.customer_token = str(AccessToken.for_user(self.customer))
        self.owner_token = str(AccessToken.for_user(self.owner))

    async def test_unauthenticated_connection_rejected(self):
        """Unauthenticated connections must be rejected with 4003 or connection refused."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/"
        )
        connected, _ = await communicator.connect()
        self.assertFalse(connected)
        await communicator.disconnect()

    async def test_authenticated_customer_tracking(self):
        """Authenticated customer connecting with JWT receives INITIAL_STATE and PONG."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/orders/{self.order.id}/tracking/?token={self.customer_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # Should receive INITIAL_STATE snapshot
        response = await communicator.receive_json_from()
        self.assertEqual(response.get('type'), 'INITIAL_STATE')
        self.assertEqual(response.get('order', {}).get('id'), self.order.id)
        self.assertEqual(response.get('order', {}).get('delivery_otp'), '1234')

        # Test keep-alive PING/PONG
        await communicator.send_json_to({'type': 'PING'})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong.get('type'), 'PONG')

        await communicator.disconnect()

    async def test_owner_orders_connection(self):
        """Store owner connecting with JWT receives connection confirmation."""
        communicator = WebsocketCommunicator(
            application,
            f"/ws/owner/orders/?token={self.owner_token}"
        )
        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        msg = await communicator.receive_json_from()
        self.assertEqual(msg.get('type'), 'CONNECTION_ESTABLISHED')

        await communicator.disconnect()
