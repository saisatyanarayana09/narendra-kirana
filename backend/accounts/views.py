from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect
from django.contrib.auth import login
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Address, CustomerProfile
from .serializers import CustomerSignupSerializer, UserSerializer, AddressSerializer

from rest_framework.throttling import AnonRateThrottle

class CustomerSignupView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = CustomerSignupSerializer
    throttle_classes = [AnonRateThrottle]

    

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support either 'username', 'email', or 'emailOrUsername' from frontend
        identifier = attrs.get(self.username_field) or self.initial_data.get('email') or self.initial_data.get('emailOrUsername')
        if identifier:
            attrs[self.username_field] = str(identifier).strip()

        data = super().validate(attrs)
        user = self.user

        # Auto-sync permissions for store operators
        needs_update = False
        fields_to_update = []
        if getattr(user, 'is_owner', False) and not user.is_staff:
            user.is_staff = True
            needs_update = True
            fields_to_update.append('is_staff')
        if (user.is_staff or user.is_superuser) and not getattr(user, 'is_owner', False):
            user.is_owner = True
            needs_update = True
            fields_to_update.append('is_owner')
        if needs_update:
            user.save(update_fields=fields_to_update)

        data['user'] = UserSerializer(user).data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AnonRateThrottle]

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import os

class GoogleOwnerLoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        token = request.data.get('credential')
        token_type = request.data.get('token_type', 'id_token')
        
        if not token:
            return Response({'detail': 'No credential provided'}, status=400)
            
        try:
            email = None
            if token_type == 'access_token':
                import requests
                response = requests.get(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    headers={'Authorization': f'Bearer {token}'}
                )
                if not response.ok:
                    return Response({'detail': 'Invalid Google access token.'}, status=400)
                email = response.json().get('email')
            else:
                client_id = os.getenv('GOOGLE_CLIENT_ID')
                if client_id:
                    idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
                else:
                    idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
                email = idinfo.get('email')

            if not email:
                return Response({'detail': 'Google account has no email.'}, status=400)
                
            # Check if user exists and has owner or staff permissions
            user = User.objects.filter(email__iexact=email).first()
            if not user or not (getattr(user, 'is_owner', False) or user.is_staff or user.is_superuser):
                return Response({'detail': f'No owner/staff account associated with Google account {email}.'}, status=403)
                
            # Auto-sync permissions
            needs_update = False
            fields_to_update = []
            if not getattr(user, 'is_owner', False):
                user.is_owner = True
                needs_update = True
                fields_to_update.append('is_owner')
            if not user.is_staff:
                user.is_staff = True
                needs_update = True
                fields_to_update.append('is_staff')
            if needs_update:
                user.save(update_fields=fields_to_update)

            refresh = RefreshToken.for_user(user)
            
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            })
            
        except ValueError:
            return Response({'detail': 'Invalid Google token.'}, status=400)
        except Exception as e:
            return Response({'detail': str(e)}, status=500)

class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_object(self):
        return self.request.user

from accounts.permissions import IsOwnerUser

class CustomerListView(generics.ListAPIView):
    permission_classes = (IsOwnerUser,)
    serializer_class = UserSerializer
    pagination_class = None

    def get_queryset(self):
        return User.objects.filter(is_customer=True).select_related('customer_profile').order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        all_customers = User.objects.filter(is_customer=True)
        counts = {
            'total': all_customers.count(),
            'active': all_customers.filter(is_active=True).count(),
            'inactive': all_customers.filter(is_active=False).count(),
            'delete_requested': all_customers.filter(customer_profile__delete_requested=True).count()
        }
        
        return Response({
            'customers': serializer.data,
            'counts': counts,
            'results': serializer.data
        })

class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

from .serializers import WalletSerializer
from .models import Wallet

class WalletView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WalletSerializer

    def get_object(self):
        wallet, created = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .utils import email_verification_token

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        
        if not uidb64 or not token:
            return Response({'error': 'Missing parameters.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and email_verification_token.check_token(user, token):
            if user.is_active:
                return Response({'message': 'Account is already active.'}, status=status.HTTP_200_OK)
            user.is_active = True
            user.save()
            return Response({'message': 'Account activated successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Activation link is invalid or expired.'}, status=status.HTTP_400_BAD_REQUEST)

from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        portal = request.data.get('portal', 'customer')
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if user:
            # If portal is owner, verify user is an owner, staff, or superuser
            is_owner_account = bool(user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser)
            if portal == 'owner' and not is_owner_account:
                # Do not send owner reset link to non-owner accounts; safely return generic response
                return Response({'message': 'If an account with that email exists, we have sent a password reset link.'}, status=status.HTTP_200_OK)

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            if portal == 'owner':
                reset_link = f"{frontend_url}/owner/reset-password?uid={uid}&token={token}"
                email_subject = 'Owner Portal - Password Reset Request - Narendra Kirana'
                email_body = (
                    f"Hello {user.first_name or user.username},\n\n"
                    f"You are receiving this email because you requested a password reset for your Narendra Kirana Owner Portal account.\n\n"
                    f"Please click the link below to set a new password:\n{reset_link}\n\n"
                    f"If you did not request this password reset, you can safely ignore this email.\n\n"
                    f"Best regards,\nNarendra Kirana Store Management"
                )
            else:
                reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
                email_subject = 'Password Reset Request - Narendra Kirana'
                email_body = (
                    f"Hello,\n\n"
                    f"You requested to reset your password for your Narendra Kirana account.\n\n"
                    f"Click the link below to set a new password:\n{reset_link}\n\n"
                    f"📱 Mobile Note: If you have the Narendra Kirana mobile app installed on your phone, opening this link will launch the app directly. Otherwise, it will open safely in your web browser.\n\n"
                    f"If you did not request this password reset, please ignore this email.\n\n"
                    f"Best regards,\nNarendra Kirana Team"
                )
            
            from store.email_service import send_store_email_async
            send_store_email_async(
                subject=email_subject,
                message=email_body,
                recipient_list=[user.email],
                fail_silently=True,
            )
                
        # Always return success to prevent email enumeration
        return Response({'message': 'If an account with that email exists, we have sent a password reset link.'}, status=status.HTTP_200_OK)

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        portal = request.data.get('portal')
        
        if not uidb64 or not token or not new_password:
            return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
                return Response({'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'The reset link is invalid, possibly because it has already been used.'}, status=status.HTTP_400_BAD_REQUEST)


class RequestDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required to request deletion.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not request.user.check_password(password):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = request.user
        if hasattr(user, 'customer_profile'):
            user.customer_profile.delete_requested = True
            user.customer_profile.save()
            return Response({'message': 'Account deletion requested successfully.'}, status=status.HTTP_200_OK)
        return Response({'error': 'Not a customer profile.'}, status=status.HTTP_400_BAD_REQUEST)

class ApproveDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.is_active = False
                
                # Free up the email and mobile for future signups, but STORE the mobile in username for memory
                old_mobile = user.customer_profile.mobile_number or "none"
                user.username = f"del_{old_mobile}_{user.username}"[:150]
                user.email = f"del_{user.id}_{user.email}"[:254]
                
                user.customer_profile.mobile_number = None
                user.customer_profile.delete_requested = False
                
                user.customer_profile.save()
                user.save()
                return Response({'message': 'Account successfully deactivated (soft deleted).'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

class RejectDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, is_customer=True)
            if hasattr(user, 'customer_profile') and user.customer_profile.delete_requested:
                user.customer_profile.delete_requested = False
                user.customer_profile.save()
                return Response({'message': 'Account deletion request rejected.'}, status=status.HTTP_200_OK)
            return Response({'error': 'User has not requested deletion.'}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


from orders.models import Order
from django.db.models import Sum

class OwnerCustomerDetailView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]
    
    def get(self, request, pk):
        try:
            customer_user = User.objects.get(pk=pk, is_customer=True)
            
            # 1. Base User Info
            serializer = UserSerializer(customer_user)
            data = serializer.data
            
            # 2. Wallet Balance
            wallet_balance = 0
            if hasattr(customer_user, 'wallet'):
                wallet_balance = float(customer_user.wallet.balance)
                
            # 3. Aggregated Sales (only non-rejected orders)
            orders = Order.objects.filter(customer=customer_user).exclude(status='REJECTED')
            total_orders = orders.count()
            total_spent = orders.aggregate(total=Sum('total_amount'))['total'] or 0
            
            # 4. Recent Orders
            recent_orders = orders.order_by('-created_at')[:5]
            recent_orders_data = [{
                'id': order.id,
                'created_at': order.created_at,
                'status': order.status,
                'total_amount': float(order.total_amount)
            } for order in recent_orders]
            
            # Append aggregated data
            data['wallet_balance'] = wallet_balance
            data['total_orders'] = total_orders
            data['total_spent'] = float(total_spent)
            data['recent_orders'] = recent_orders_data
            
            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)


@csrf_exempt
def admin_google_login(request):
    if request.method == 'POST':
        token = request.POST.get('credential')
        if not token:
            return redirect('/narendra_secure_vault_99/login/?error=missing_token')
            
        try:
            client_id = os.getenv('GOOGLE_CLIENT_ID')
            if client_id:
                idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), client_id)
            else:
                idinfo = id_token.verify_oauth2_token(token, google_requests.Request())
                
            email = idinfo.get('email')
            user = User.objects.filter(email__iexact=email).first()
            
            if user and (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
                # Auto-sync permissions
                needs_update = False
                fields_to_update = []
                if not user.is_staff:
                    user.is_staff = True
                    needs_update = True
                    fields_to_update.append('is_staff')
                if not getattr(user, 'is_owner', False):
                    user.is_owner = True
                    needs_update = True
                    fields_to_update.append('is_owner')
                if needs_update:
                    user.save(update_fields=fields_to_update)

                login(request, user)
                return redirect('/')
            else:
                return redirect('/narendra_secure_vault_99/login/?error=unauthorized')
        except Exception as e:
            return redirect('/narendra_secure_vault_99/login/?error=invalid_token')
    return redirect('/narendra_secure_vault_99/login/')


class ReferralLookupView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        try:
            code = request.query_params.get('code')
            if not code:
                return Response({'error': 'No code provided'}, status=400)
                
            profile = CustomerProfile.objects.select_related('user').get(referral_code__iexact=code)
            name = profile.user.first_name or profile.user.username
            return Response({'referrer_name': name})
        except CustomerProfile.DoesNotExist:
            return Response({'error': 'Invalid referral code'}, status=404)
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=500)

