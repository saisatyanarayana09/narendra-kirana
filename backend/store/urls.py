from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StoreSettingsView, 
    FeedbackViewSet, 
    HomepageSectionViewSet, 
    VoiceSearchView,
    StoreEmailSettingsView,
    TestStoreEmailView
)

router = DefaultRouter()
router.register(r'feedback', FeedbackViewSet, basename='feedback')
router.register(r'homepage-sections', HomepageSectionViewSet, basename='homepage-section')

urlpatterns = [
    path('settings/', StoreSettingsView.as_view(), name='store-settings'),
    path('email-settings/', StoreEmailSettingsView.as_view(), name='store-email-settings'),
    path('email-settings/test/', TestStoreEmailView.as_view(), name='store-email-settings-test'),
    path('voice-search/', VoiceSearchView.as_view(), name='store-voice-search'),

    path('', include(router.urls)),
]
