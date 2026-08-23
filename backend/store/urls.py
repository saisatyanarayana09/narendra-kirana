from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreSettingsView, FeedbackViewSet, HomepageSectionViewSet

router = DefaultRouter()
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'homepage-sections', HomepageSectionViewSet, basename='homepage-section')

urlpatterns = [
    path('settings/', StoreSettingsView.as_view(), name='store-settings'),

    path('', include(router.urls)),
]
