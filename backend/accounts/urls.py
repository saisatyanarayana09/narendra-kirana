from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter
from .views import RunMigrateView, RequestDeleteView, ApproveDeleteView, RejectDeleteView, PasswordResetRequestView, PasswordResetConfirmView, VerifyEmailView, CustomerSignupView, CustomTokenObtainPairView, ProfileView, CustomerListView, AddressViewSet, WalletView

router = DefaultRouter()
router.register(r'addresses', AddressViewSet, basename='address')

urlpatterns = [

    path('trigger-migrate/', RunMigrateView.as_view()),
    path('request-delete/', RequestDeleteView.as_view(), name='request-delete'),
    path('customers/<int:user_id>/approve-delete/', ApproveDeleteView.as_view(), name='approve-delete'),
    path('customers/<int:user_id>/reject-delete/', RejectDeleteView.as_view(), name='reject-delete'),

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
