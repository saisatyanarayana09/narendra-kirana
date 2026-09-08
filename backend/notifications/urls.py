from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet,
    OwnerNotificationCreateView,
    RegisterPushTokenView,
    UnregisterPushTokenView,
)

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('push-token/', RegisterPushTokenView.as_view(), name='register-push-token'),
    path('push-token/delete/', UnregisterPushTokenView.as_view(), name='unregister-push-token'),
    path('owner/send/', OwnerNotificationCreateView.as_view(), name='owner-send-notification'),
    path('', include(router.urls)),
]

