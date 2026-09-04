import io
import os
import asyncio
from django.template.loader import get_template
from django.core.mail import EmailMessage
from django.conf import settings
from store.models import StoreSettings

def send_order_confirmation_email(order):
    """
    Send a simple order confirmation email without a PDF.
    """
    email_address = order.customer.email or order.customer.username
    if not email_address or '@' not in email_address:
        print(f"Customer has no email address for order {order.id}")
        return

    store_settings = StoreSettings.load()
    subject = f"Order Confirmation - {store_settings.store_name} (Order #{order.id})"
    
    body = f"""Hello {order.customer.first_name},

Thank you for your order! We have received your order #{order.id} and are currently processing it.

Order Summary:
Total Items: {order.items.count()}
Estimated Total: Rs. {order.total_amount}

We will notify you once your order is ready. If you have any questions, please contact us at {store_settings.store_phone or store_settings.store_email}.

Best regards,
{store_settings.store_name} Team
"""

    from store.email_service import send_store_email
    try:
        send_store_email(
            subject=subject,
            message=body,
            recipient_list=[email_address],
            fail_silently=False,
        )
        print(f"Sent confirmation email to {email_address}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_final_invoice_email(order):
    """
    Send an HTML email containing a link for the customer to view/download their invoice on the frontend.
    """
    email_address = order.customer.email or order.customer.username
    if not email_address or '@' not in email_address:
        print(f"Customer has no email address for order {order.id}")
        return

    # Fetch store settings
    store_settings = StoreSettings.load()

    # Calculate derived values
    subtotal = order.total_amount + order.discount_applied
    
    # The URL to the frontend invoice page
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
    invoice_link = f"{frontend_url}/orders/{order.id}/invoice"

    # Prepare context for the template
    context = {
        'order': order,
        'items': order.items.all(),
        'settings': store_settings,
        'store_settings': store_settings,
        'subtotal': subtotal,
        'discount_applied': order.discount_applied,
        'invoice_link': invoice_link,
    }

    # Render HTML Email Body
    template = get_template('store/invoice_email.html')
    html_content = template.render(context)

    # Prepare email
    subject = f"Your Invoice from {store_settings.store_name} (Order #{order.id})"
    
    # Plain text fallback
    text_content = f"""Hello {order.customer.first_name},

Thank you for shopping with us! Your order #{order.id} is now complete.

You can view and download your official invoice here: {invoice_link}

We would love to hear about your experience! Please let us know how we did.

Best regards,
{store_settings.store_name} Team
"""

    from store.email_service import send_store_email
    try:
        send_store_email(
            subject=subject,
            message=text_content,
            recipient_list=[email_address],
            html_message=html_content,
            fail_silently=False,
        )
        print(f"Sent HTML invoice email to {email_address}")
    except Exception as e:
        print(f"Failed to send email: {e}")
