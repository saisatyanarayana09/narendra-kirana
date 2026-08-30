from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from store.views import BackendHealthView

urlpatterns = [
    path('', RedirectView.as_view(url='/narendra_secure_vault_99/', permanent=False), name='root-redirect'),
    path('health/', BackendHealthView.as_view(), name='backend-health'),
    path('narendra_secure_vault_99/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/', include('products.urls')),
    path('api/v1/cart/', include('cart.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/offers/', include('offers.urls')),
    path('api/v1/store/', include('store.urls')),
    path('api/v1/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
