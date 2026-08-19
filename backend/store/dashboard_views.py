from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from django.db.models import Count, Sum, Q
from datetime import timedelta
import psutil
import os
import sys


class APIDashboardDataView(View):
    """JSON endpoint that provides all dashboard data."""
    
    def get(self, request):
        from orders.models import Order
        from products.models import Product, Category
        from accounts.models import User
        from notifications.models import Notification
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # --- Orders ---
        total_orders = Order.objects.count()
        today_orders = Order.objects.filter(created_at__gte=today_start).count()
        pending_orders = Order.objects.filter(status=Order.Status.NEW).count()
        active_orders = Order.objects.filter(status__in=[Order.Status.ACCEPTED, Order.Status.PREPARING, Order.Status.READY]).count()
        completed_orders = Order.objects.filter(status=Order.Status.COMPLETED).count()
        rejected_orders = Order.objects.filter(status=Order.Status.REJECTED).count()
        
        # Revenue
        total_revenue = Order.objects.filter(status=Order.Status.COMPLETED).aggregate(total=Sum('total_amount'))['total'] or 0
        today_revenue = Order.objects.filter(status=Order.Status.COMPLETED, created_at__gte=today_start).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # --- Products ---
        total_products = Product.objects.count()
        active_products = Product.objects.filter(is_active=True).count()
        out_of_stock = Product.objects.filter(is_in_stock=False).count()
        total_categories = Category.objects.count()
        
        # --- Users ---
        total_users = User.objects.count()
        total_customers = User.objects.filter(is_customer=True).count()
        today_signups = User.objects.filter(date_joined__gte=today_start).count()
        
        # --- Notifications ---
        total_notifications = Notification.objects.count()
        unread_notifications = Notification.objects.filter(is_read=False).count()
        
        # --- Recent Orders (last 10) ---
        recent_orders = list(
            Order.objects.select_related('customer')
            .order_by('-created_at')[:10]
            .values('id', 'status', 'total_amount', 'created_at', 'customer__first_name', 'customer__last_name')
        )
        for o in recent_orders:
            o['created_at'] = o['created_at'].isoformat()
            o['total_amount'] = float(o['total_amount'])
        
        # --- System Info ---
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=0.1)
            system_info = {
                'python_version': sys.version.split()[0],
                'cpu_percent': cpu_percent,
                'memory_total_gb': round(memory.total / (1024**3), 1),
                'memory_used_gb': round(memory.used / (1024**3), 1),
                'memory_percent': memory.percent,
                'pid': os.getpid(),
            }
        except Exception:
            system_info = {
                'python_version': sys.version.split()[0],
                'cpu_percent': 0,
                'memory_total_gb': 0,
                'memory_used_gb': 0,
                'memory_percent': 0,
                'pid': os.getpid(),
            }
        
        # --- API Endpoints ---
        endpoints = [
            {'method': 'POST', 'path': '/api/v1/auth/signup/', 'description': 'Customer signup', 'app': 'accounts'},
            {'method': 'POST', 'path': '/api/v1/auth/login/', 'description': 'JWT login', 'app': 'accounts'},
            {'method': 'POST', 'path': '/api/v1/auth/token/refresh/', 'description': 'Refresh JWT token', 'app': 'accounts'},
            {'method': 'GET/PUT', 'path': '/api/v1/auth/profile/', 'description': 'User profile', 'app': 'accounts'},
            {'method': 'GET', 'path': '/api/v1/auth/wallet/', 'description': 'Wallet balance & transactions', 'app': 'accounts'},
            {'method': 'GET', 'path': '/api/v1/auth/customers/', 'description': 'List customers (owner)', 'app': 'accounts'},
            {'method': 'CRUD', 'path': '/api/v1/auth/addresses/', 'description': 'Customer addresses', 'app': 'accounts'},
            {'method': 'CRUD', 'path': '/api/v1/categories/', 'description': 'Product categories', 'app': 'products'},
            {'method': 'CRUD', 'path': '/api/v1/products/', 'description': 'Products', 'app': 'products'},
            {'method': 'CRUD', 'path': '/api/v1/favorites/', 'description': 'Customer favorites', 'app': 'products'},
            {'method': 'GET', 'path': '/api/v1/cart/', 'description': 'View cart', 'app': 'cart'},
            {'method': 'POST', 'path': '/api/v1/cart/items/', 'description': 'Add item to cart', 'app': 'cart'},
            {'method': 'PATCH/DEL', 'path': '/api/v1/cart/items/{id}/', 'description': 'Update/remove cart item', 'app': 'cart'},
            {'method': 'POST', 'path': '/api/v1/cart/apply-promo/', 'description': 'Apply promo code', 'app': 'cart'},
            {'method': 'CRUD', 'path': '/api/v1/orders/', 'description': 'Orders', 'app': 'orders'},
            {'method': 'PATCH', 'path': '/api/v1/orders/{id}/status/', 'description': 'Update order status', 'app': 'orders'},
            {'method': 'PATCH', 'path': '/api/v1/orders/{id}/owner_note/', 'description': 'Add owner note', 'app': 'orders'},
            {'method': 'POST', 'path': '/api/v1/orders/{id}/reject_item/', 'description': 'Reject single item', 'app': 'orders'},
            {'method': 'GET', 'path': '/api/v1/orders/analytics/', 'description': 'Sales analytics', 'app': 'orders'},
            {'method': 'CRUD', 'path': '/api/v1/offers/banners/', 'description': 'Promotional banners', 'app': 'offers'},
            {'method': 'CRUD', 'path': '/api/v1/offers/promocodes/', 'description': 'Promo codes', 'app': 'offers'},
            {'method': 'GET/PUT', 'path': '/api/v1/offers/referral-settings/', 'description': 'Referral settings', 'app': 'offers'},
            {'method': 'CRUD', 'path': '/api/v1/offers/referral-milestones/', 'description': 'Referral milestones', 'app': 'offers'},
            {'method': 'GET', 'path': '/api/v1/offers/referrals/', 'description': 'Referral history', 'app': 'offers'},
            {'method': 'GET/PUT', 'path': '/api/v1/store/settings/', 'description': 'Store settings', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/store/feedback/', 'description': 'Customer feedback', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/store/homepage-sections/', 'description': 'Homepage sections', 'app': 'store'},
            {'method': 'CRUD', 'path': '/api/v1/notifications/', 'description': 'Notifications', 'app': 'notifications'},
            {'method': 'POST', 'path': '/api/v1/notifications/owner/send/', 'description': 'Owner send notification', 'app': 'notifications'},
        ]
        
        data = {
            'timestamp': now.isoformat(),
            'orders': {
                'total': total_orders,
                'today': today_orders,
                'pending': pending_orders,
                'active': active_orders,
                'completed': completed_orders,
                'rejected': rejected_orders,
            },
            'revenue': {
                'total': float(total_revenue),
                'today': float(today_revenue),
            },
            'products': {
                'total': total_products,
                'active': active_products,
                'out_of_stock': out_of_stock,
                'categories': total_categories,
            },
            'users': {
                'total': total_users,
                'customers': total_customers,
                'today_signups': today_signups,
            },
            'notifications': {
                'total': total_notifications,
                'unread': unread_notifications,
            },
            'recent_orders': recent_orders,
            'system': system_info,
            'endpoints': endpoints,
        }
        
        return JsonResponse(data)
