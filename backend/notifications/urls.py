from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, OwnerNotificationCreateView

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('owner/send/', OwnerNotificationCreateView.as_view(), name='owner-send-notification'),
    path('', include(router.urls)),
]
