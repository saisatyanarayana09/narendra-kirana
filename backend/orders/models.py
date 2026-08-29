from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string
from products.models import Product


def order_id():
    from django.utils import timezone
    from orders.models import Order
    now = timezone.now()
    prefix = f"ORD-{now.strftime('%y%m')}-"
    last_order = Order.objects.filter(id__startswith=prefix).order_by('id').last()
    if not last_order:
        return prefix + "0001"
    
    try:
        last_num = int(last_order.id.split('-')[-1])
        return prefix + f"{last_num + 1:04d}"
    except (ValueError, IndexError):
        return prefix + "0001"


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        PREPARING = 'PREPARING', 'Preparing'
        READY = 'READY', 'Ready for pickup'
        COMPLETED = 'COMPLETED', 'Completed'
        REJECTED = 'REJECTED', 'Rejected'

    id = models.CharField(primary_key=True, max_length=20, default=order_id, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    
    # Delivery Info
    order_type = models.CharField(max_length=15, choices=[('PICKUP', 'Store Pickup'), ('DELIVERY', 'Home Delivery')], default='PICKUP')
    delivery_address = models.TextField(blank=True)
    delivery_pincode = models.CharField(max_length=20, blank=True)
    delivery_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    promo_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    wallet_discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pickup_time = models.CharField(max_length=80, blank=True)
    customer_note = models.TextField(blank=True)
    owner_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='order_items')
    product_name_snapshot = models.CharField(max_length=200)
    unit_snapshot = models.CharField(max_length=50)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=10,
        choices=[('ACCEPTED', 'Accepted'), ('REJECTED', 'Rejected')],
        default='ACCEPTED'
    )
