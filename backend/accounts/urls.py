from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import EnvCheckView, PasswordResetRequestView, PasswordResetConfirmView, VerifyEmailView, CustomerSignupView, CustomTokenObtainPairView, ProfileView, CustomerListView, AddressViewSet, WalletView

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('env-check/', EnvCheckView.as_view()),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),

    path('signup/', CustomerSignupView.as_view(), name='signup'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('customers/', CustomerListView.as_view(), name='customer-list'),
    path('', include(router.urls)),
]
