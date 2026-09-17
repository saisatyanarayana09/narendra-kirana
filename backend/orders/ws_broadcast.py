import logging
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_order_created(order, customer_name, customer_phone="", items_count=0):
    """Broadcasts newly created order to the store owner live feed."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            "store_owner",
            {
                "type": "owner_order_created",
                "order": {
                    "id": str(order.id),
                    "total_amount": str(order.total_amount),
                    "customer_name": customer_name,
                    "customer_phone": customer_phone,
                    "order_type": order.order_type,
                    "status": order.status,
                    "created_at": order.created_at.isoformat(),
                    "items_count": items_count,
                }
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_created WS error: %s", e)


def broadcast_order_status(order_id, next_status, delivery_otp=""):
    """Broadcasts status change to tracking customer and store owner."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        # Broadcast to specific order tracking room
        async_to_sync(channel_layer.group_send)(
            f"order_{order_id}",
            {
                "type": "order_status_broadcast",
                "order_id": str(order_id),
                "status": next_status,
                "delivery_otp": delivery_otp,
                "updated_at": timezone.now().isoformat(),
            }
        )
        # Broadcast to store owner dashboard
        async_to_sync(channel_layer.group_send)(
            "store_owner",
            {
                "type": "owner_order_status",
                "order_id": str(order_id),
                "status": next_status,
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_status WS error: %s", e)


def broadcast_rider_location(order_id, latitude, longitude, heading=None, speed=None):
    """Broadcasts rider live GPS coordinates to tracking customer."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            f"order_{order_id}",
            {
                "type": "rider_location_broadcast",
                "order_id": str(order_id),
                "latitude": float(latitude),
                "longitude": float(longitude),
                "heading": float(heading) if heading is not None else None,
                "speed": float(speed) if speed is not None else None,
                "timestamp": timezone.now().isoformat(),
            }
        )
    except Exception as e:
        logger.debug("broadcast_rider_location WS error: %s", e)


def broadcast_order_ready_dispatch(order):
    """Broadcasts READY order to online delivery partners."""
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
        async_to_sync(channel_layer.group_send)(
            "delivery_dispatch",
            {
                "type": "dispatch_order_ready",
                "order": {
                    "id": str(order.id),
                    "total_amount": str(order.total_amount),
                    "delivery_address": order.delivery_address,
                    "order_type": order.order_type,
                }
            }
        )
    except Exception as e:
        logger.debug("broadcast_order_ready_dispatch WS error: %s", e)
