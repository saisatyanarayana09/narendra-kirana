import logging
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import redirect
from django.contrib.auth import login

logger = logging.getLogger(__name__)
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

    

from rest_framework import exceptions
from django.utils import timezone
from datetime import timedelta
import secrets

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Support either 'username', 'email', or 'emailOrUsername' from frontend
        identifier = attrs.get(self.username_field) or self.initial_data.get('email') or self.initial_data.get('emailOrUsername')
        if identifier:
            attrs[self.username_field] = str(identifier).strip()

        # Extract client IP address
        request = self.context.get('request')
        ip_address = '127.0.0.1'
        if request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_address = x_forwarded.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR') or '127.0.0.1'

        # Locate target user if exists for security checks
        target_user = None
        if identifier:
            target_user = User.objects.filter(username__iexact=str(identifier).strip()).first()
            if not target_user:
                target_user = User.objects.filter(email__iexact=str(identifier).strip()).first()

        # Check if account is locked
        if target_user and target_user.is_locked:
            # Auto-expire lockout if duration passed
            if target_user.lockout_until and timezone.now() >= target_user.lockout_until:
                target_user.is_locked = False
                target_user.failed_login_attempts = 0
                target_user.lockout_until = None
                target_user.lockout_reason = ''
                target_user.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_until', 'lockout_reason'])
            else:
                raise exceptions.PermissionDenied(
                    'Your account has been locked due to excessive failed login attempts. '
                    'Please reset your password or contact store support.'
                )

        # Check if account is not activated yet
        if target_user and not target_user.is_active:
            password = attrs.get('password')
            if password and target_user.check_password(password):
                raise exceptions.AuthenticationFailed({
                    'detail': 'Your account has not been activated yet. Please verify your email to log in.',
                    'code': 'account_inactive',
                    'email': target_user.email
                })

        try:
            data = super().validate(attrs)
        except exceptions.AuthenticationFailed as auth_err:
            if target_user:
                target_user.failed_login_attempts += 1
                target_user.last_failed_login_at = timezone.now()
                target_user.last_failed_login_ip = ip_address

                if target_user.failed_login_attempts >= 10 and not target_user.is_locked:
                    target_user.is_locked = True
                    target_user.locked_at = timezone.now()
                    target_user.lockout_until = timezone.now() + timedelta(minutes=30)
                    target_user.lockout_reason = f"10 consecutive failed login attempts from IP {ip_address}."
                    target_user.save(update_fields=[
                        'failed_login_attempts', 'last_failed_login_at', 'last_failed_login_ip',
                        'is_locked', 'locked_at', 'lockout_until', 'lockout_reason'
                    ])

                    # Trigger automated notification to owner/admin
                    try:
                        from notifications.models import Notification
                        from store.email_service import send_store_email_async
                        from .email_templates import build_account_locked_admin_email

                        owners = User.objects.filter(is_staff=True) | User.objects.filter(is_owner=True)
                        owners = owners.distinct()
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                        dashboard_url = f"{frontend_url}/owner/customers"

                        for owner in owners:
                            Notification.objects.create(
                                user=owner,
                                title=f"⚠️ Security Alert: Account Locked ({target_user.username})",
                                message=f"Account {target_user.username} ({target_user.email}) was locked after 10 failed login attempts from IP {ip_address}."
                            )
                            if owner.email:
                                admin_email = build_account_locked_admin_email(
                                    locked_user=target_user,
                                    attempts=target_user.failed_login_attempts,
                                    ip_address=ip_address,
                                    locked_at=target_user.locked_at,
                                    reason=target_user.lockout_reason,
                                    dashboard_url=dashboard_url
                                )
                                send_store_email_async(
                                    subject=admin_email['subject'],
                                    message=admin_email['text'],
                                    recipient_list=[owner.email],
                                    html_message=admin_email['html'],
                                    fail_silently=True
                                )
                    except Exception as notify_err:
                        print("Failed to dispatch admin lockout notification:", notify_err)

                    raise exceptions.PermissionDenied(
                        'Your account has been locked due to 10 consecutive failed login attempts. '
                        'Please reset your password or contact store support.'
                    )
                else:
                    target_user.save(update_fields=['failed_login_attempts', 'last_failed_login_at', 'last_failed_login_ip'])
                    remaining = 10 - target_user.failed_login_attempts
                    if remaining <= 3:
                        raise exceptions.AuthenticationFailed(
                            f'Invalid credentials. Warning: {remaining} attempt(s) remaining before account lockout.'
                        )

            raise auth_err

        user = self.user

        # Reset failed attempts and lockout on successful authentication
        if user.failed_login_attempts > 0 or user.is_locked:
            user.failed_login_attempts = 0
            user.is_locked = False
            user.lockout_until = None
            user.lockout_reason = ''
            user.save(update_fields=['failed_login_attempts', 'is_locked', 'lockout_until', 'lockout_reason'])

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
        qs = User.objects.filter(is_customer=True).select_related('customer_profile').order_by('-date_joined')
        status_param = self.request.query_params.get('status')
        if status_param == 'locked':
            qs = qs.filter(is_locked=True)
        elif status_param == 'active':
            qs = qs.filter(is_active=True, is_locked=False)
        elif status_param == 'inactive':
            qs = qs.filter(is_active=False)
        elif status_param == 'delete_requested':
            qs = qs.filter(customer_profile__delete_requested=True)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        all_customers = User.objects.filter(is_customer=True)
        counts = {
            'total': all_customers.count(),
            'active': all_customers.filter(is_active=True, is_locked=False).count(),
            'inactive': all_customers.filter(is_active=False).count(),
            'locked': all_customers.filter(is_locked=True).count(),
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
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user=self.request.user).exclude(pk=serializer.instance.pk).update(is_default=False)
        serializer.save()

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


class ResendActivationEmailView(APIView):
    """
    Allows customers whose initial verification email was lost or expired to request
    a fresh activation link.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        identifier = (request.data.get('email') or request.data.get('identifier') or '').strip()
        if not identifier:
            return Response({'error': 'Email address or username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=identifier).first()
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user or not user.email:
            # Return uniform friendly message for security / account enumeration protection
            return Response({
                'message': 'If an inactive account associated with that email exists, a verification link has been sent.'
            }, status=status.HTTP_200_OK)

        if user.is_active:
            return Response({
                'message': 'This account is already active. Please sign in with your password.'
            }, status=status.HTTP_200_OK)

        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from store.email_service import send_store_email_async
        from .email_templates import build_account_activation_email

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verify_link = f"{frontend_url}/verify-email?uid={uid}&token={token}"

        email_data = build_account_activation_email(user, verify_link)
        send_store_email_async(
            subject=email_data['subject'],
            message=email_data['text'],
            recipient_list=[user.email],
            html_message=email_data['html'],
            fail_silently=True,
        )

        return Response({
            'message': 'A fresh activation link has been sent to your email address.'
        }, status=status.HTTP_200_OK)

import hashlib
import django.contrib.auth
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.conf import settings
from .models import PasswordResetOTP, PasswordResetToken
from .email_templates import (
    build_password_reset_email,
    build_password_reset_otp_email,
    build_password_reset_link_email
)
from django.contrib.auth.password_validation import validate_password

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        portal = str(request.data.get('portal', 'customer') or 'customer').strip().lower()
        raw_method = request.data.get('method', 'link')
        method = str(raw_method or 'link').strip().lower()
        if method not in ('otp', 'link'):
            method = 'link'

        print(f"[PasswordResetRequest] email={email} portal={portal} method={method}")

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if user:
            # If portal is owner, verify user is an owner, staff, or superuser
            is_owner_account = bool(user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser)
            if portal == 'owner' and not is_owner_account:
                # Do not send owner reset link/OTP to non-owner accounts; safely return generic response
                return Response({
                    'message': 'If an owner account with that email exists, password reset instructions have been sent.',
                    'method': method
                }, status=status.HTTP_200_OK)

            from store.email_service import send_store_email_async

            # Extract client IP & User-Agent
            ip_address = '127.0.0.1'
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded:
                ip_address = x_forwarded.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR') or '127.0.0.1'
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]

            if method == 'otp':
                # Explicit method: 'otp'
                otp_code = f"{secrets.randbelow(900000) + 100000}"

                # Invalidate prior active OTPs for this user and portal
                PasswordResetOTP.objects.filter(user=user, portal=portal, is_used=False).update(is_used=True)

                # Persist the new OTP with strict 15-minute expiration
                PasswordResetOTP.objects.create(
                    user=user,
                    otp_code=otp_code,
                    portal=portal,
                    expires_at=timezone.now() + timedelta(minutes=15),
                    ip_address=ip_address
                )

                email_payload = build_password_reset_otp_email(
                    user=user,
                    otp_code=otp_code,
                    portal=portal
                )
                send_store_email_async(
                    subject=email_payload['subject'],
                    message=email_payload['text'],
                    recipient_list=[user.email],
                    html_message=email_payload['html'],
                    fail_silently=True,
                )
                return Response({
                    'message': 'A 6-digit verification code has been sent to your email.',
                    'method': 'otp'
                }, status=status.HTTP_200_OK)

            else:
                # Default method: 'link'
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                raw_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

                # Invalidate prior active reset tokens for this user and portal
                PasswordResetToken.objects.filter(user=user, portal=portal, is_used=False).update(is_used=True)

                # Persist token with strict 15-minute expiration
                PasswordResetToken.objects.create(
                    user=user,
                    token_hash=token_hash,
                    portal=portal,
                    expires_at=timezone.now() + timedelta(minutes=15),
                    ip_address=ip_address,
                    user_agent=user_agent
                )

                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                if portal == 'owner':
                    reset_link = f"{frontend_url}/owner/reset-password?uid={uid}&token={raw_token}"
                else:
                    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={raw_token}"

                email_payload = build_password_reset_link_email(
                    user=user,
                    reset_link=reset_link,
                    portal=portal
                )
                send_store_email_async(
                    subject=email_payload['subject'],
                    message=email_payload['text'],
                    recipient_list=[user.email],
                    html_message=email_payload['html'],
                    fail_silently=True,
                )
                return Response({
                    'message': 'A secure password reset link has been sent to your email.',
                    'method': 'link'
                }, status=status.HTTP_200_OK)

        # Always return generic success to prevent email enumeration
        generic_msg = 'A password reset link has been sent to your email.' if method == 'link' else 'A 6-digit verification code has been sent to your email.'
        return Response({'message': f'If an account with that email exists, {generic_msg.lower()}', 'method': method}, status=status.HTTP_200_OK)


class PasswordResetValidateTokenView(APIView):
    """
    Pre-flight health check for reset links without consuming the token.
    Allows the frontend to show immediate user feedback if a link is expired or used.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        portal = request.data.get('portal', 'customer')

        if not uidb64 or not token:
            return Response({'valid': False, 'error': 'Missing reset token parameters.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({'valid': False, 'error': 'The reset link is invalid or malformed.'}, status=status.HTTP_400_BAD_REQUEST)

        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        token_record = PasswordResetToken.objects.filter(user=user, token_hash=token_hash).first()

        if token_record:
            if token_record.is_used:
                return Response({'valid': False, 'error': 'This reset link has already been used. Please request a new link or enter your 6-digit OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.now() >= token_record.expires_at:
                return Response({'valid': False, 'error': 'This reset link has expired (15-minute limit). Please request a new link or enter your 6-digit OTP code.'}, status=status.HTTP_400_BAD_REQUEST)
            if token_record.portal and portal and token_record.portal != portal:
                return Response({'valid': False, 'error': f'This reset link was issued for the {token_record.portal} portal and cannot be used here.'}, status=status.HTTP_403_FORBIDDEN)
            return Response({'valid': True, 'email': user.email}, status=status.HTTP_200_OK)

        if default_token_generator.check_token(user, token):
            return Response({'valid': True, 'email': user.email}, status=status.HTTP_200_OK)

        return Response({'valid': False, 'error': 'The reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        portal = request.data.get('portal', 'customer')
        
        if not uidb64 or not token or not new_password:
            return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if not user:
            return Response({'error': 'The reset link is invalid or malformed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce password validation complexity
        try:
            validate_password(new_password, user=user)
        except Exception as e:
            msg = list(e.messages) if hasattr(e, 'messages') else [str(e)]
            return Response({'error': ' '.join(msg)}, status=status.HTTP_400_BAD_REQUEST)

        # Hash incoming token to query database
        token_hash = hashlib.sha256(token.encode('utf-8')).hexdigest()
        token_record = PasswordResetToken.objects.filter(user=user, token_hash=token_hash).first()

        is_valid = False
        if token_record:
            if token_record.is_used:
                return Response({'error': 'Link already used / expired. Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.now() >= token_record.expires_at:
                return Response({'error': 'Reset link has expired (15-minute limit). Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)
            if token_record.portal and portal and token_record.portal != portal:
                return Response({'error': f'This reset link was generated for the {token_record.portal} portal and cannot be used here.'}, status=status.HTTP_403_FORBIDDEN)
            is_valid = True
        elif default_token_generator.check_token(user, token):
            # Backwards compatibility check for any legacy links
            is_valid = True

        if not is_valid:
            return Response({'error': 'Link already used / expired. Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        # Update password
        user.set_password(new_password)
        # Unlock previously locked account upon verified password reset
        user.is_locked = False
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.lockout_reason = ''
        user.save()

        # Mark token as used immediately (single-use enforcement)
        if token_record:
            token_record.is_used = True
            token_record.used_at = timezone.now()
            token_record.save(update_fields=['is_used', 'used_at'])

        # Invalidate all other pending reset tokens and OTPs for this user
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        # Revoke all outstanding active JWT refresh tokens across all devices
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for outstanding in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                # Token may be expired, invalid or already blacklisted
                pass

        # Flush any server-side Django session
        if hasattr(request, 'session'):
            request.session.flush()
        if request.user.is_authenticated:
            django.contrib.auth.logout(request)

        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class PasswordResetVerifyOTPView(APIView):
    """
    Step 1 of 2 in OTP Reset Flow:
    Validates that the provided 6-digit OTP matches an active, non-expired OTP record
    without consuming it, allowing the frontend to transition cleanly to the
    'Create New Password' step.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        portal = request.data.get('portal', 'customer')

        if not email or not otp:
            return Response({'valid': False, 'error': 'Email and 6-digit OTP code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'valid': False, 'error': 'Invalid email or OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'valid': False, 'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            portal=portal,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({'valid': False, 'error': 'The OTP code is invalid or has expired (15-minute limit). Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce rate-limiting on OTP verification attempts (max 5)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response({'valid': False, 'error': 'Too many failed OTP attempts. This code has been invalidated. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp:
            otp_record.attempts += 1
            otp_record.save(update_fields=['attempts'])
            remaining = 5 - otp_record.attempts
            return Response({'valid': False, 'error': f'Incorrect OTP code. {remaining} attempt(s) remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'valid': True,
            'email': user.email,
            'message': 'Code verified successfully. Please enter your new password.'
        }, status=status.HTTP_200_OK)


class PasswordResetOTPConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp = request.data.get('otp', '').strip()
        new_password = request.data.get('new_password', '')
        portal = request.data.get('portal', 'customer')

        if not email or not otp or not new_password:
            return Response({'error': 'Email, OTP, and new password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'error': 'Invalid email or OTP code.'}, status=status.HTTP_400_BAD_REQUEST)

        if portal == 'owner' and not (user.is_staff or getattr(user, 'is_owner', False) or user.is_superuser):
            return Response({'error': 'This account does not have owner access.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            validate_password(new_password, user=user)
        except Exception as e:
            msg = list(e.messages) if hasattr(e, 'messages') else [str(e)]
            return Response({'error': ' '.join(msg)}, status=status.HTTP_400_BAD_REQUEST)

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            portal=portal,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record or not otp_record.is_valid():
            return Response({'error': 'The OTP code is invalid or has expired (15-minute limit). Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce rate-limiting on OTP verification attempts (max 5)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response({'error': 'Too many failed OTP attempts. This code has been invalidated. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_code != otp:
            otp_record.attempts += 1
            otp_record.save(update_fields=['attempts'])
            remaining = 5 - otp_record.attempts
            return Response({'error': f'Incorrect OTP code. {remaining} attempt(s) remaining.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mark this OTP used immediately
        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        # Invalidate any other active OTPs and reset tokens for this user
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

        # Reset user password and clear any brute-force lockout
        user.set_password(new_password)
        user.is_locked = False
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.lockout_reason = ''
        user.save()

        # Revoke all outstanding active JWT refresh tokens across all devices
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for outstanding in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            pass

        return Response({'message': 'Password has been reset successfully. You can now log in with your new password.'}, status=status.HTTP_200_OK)


class AdminUnlockUserView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_locked = False
            user.failed_login_attempts = 0
            user.lockout_until = None
            user.lockout_reason = ''
            user.save(update_fields=['is_locked', 'failed_login_attempts', 'lockout_until', 'lockout_reason'])
            return Response({
                'message': f'Account {user.username} has been unlocked successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminLockUserView(APIView):
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            reason = request.data.get('reason') or f"Manually locked by administrator {request.user.username}"
            user.is_locked = True
            user.locked_at = timezone.now()
            user.lockout_reason = reason
            user.save(update_fields=['is_locked', 'locked_at', 'lockout_reason'])
            return Response({
                'message': f'Account {user.username} has been locked.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminActivateUserView(APIView):
    """
    Allows the store owner to manually activate any customer account directly from
    the Owner Portal Customer Directory with 1 click.
    """
    permission_classes = [IsAuthenticated, IsOwnerUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
            user.is_active = True
            user.failed_login_attempts = 0
            user.save(update_fields=['is_active', 'failed_login_attempts'])
            return Response({
                'message': f'Account {user.username} has been activated successfully.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


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
            
            # If customer is not active, generate the current activation link for the store owner
            if not customer_user.is_active:
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from .utils import email_verification_token
                uid = urlsafe_base64_encode(force_bytes(customer_user.pk))
                token = email_verification_token.make_token(customer_user)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                data['activation_link'] = f"{frontend_url}/verify-email?uid={uid}&token={token}"
            else:
                data['activation_link'] = None

            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)


DEFAULT_ADMIN_GOOGLE_CLIENT_ID = '729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com'

@csrf_exempt
def admin_google_login(request):
    if request.method == 'POST':
        token = request.POST.get('credential')
        if not token:
            return redirect('/admin/login/?error=missing_token')
            
        try:
            client_id = os.getenv('GOOGLE_CLIENT_ID', DEFAULT_ADMIN_GOOGLE_CLIENT_ID)
            email = None

            # 1. Verify via google.oauth2.id_token with clock skew tolerance
            try:
                idinfo = id_token.verify_oauth2_token(
                    token, 
                    google_requests.Request(), 
                    client_id, 
                    clock_skew_in_seconds=15
                )
                email = idinfo.get('email')
            except Exception as lib_err:
                logger.warning(f"Local id_token verification failed: {lib_err}. Trying Google tokeninfo API fallback.")

            # 2. Fallback to Google's official tokeninfo endpoint
            if not email:
                import requests
                resp = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={token}', timeout=10)
                if resp.ok:
                    info = resp.json()
                    aud = info.get('aud')
                    if not client_id or aud == client_id:
                        email = info.get('email')
                    else:
                        logger.error(f"Google token audience mismatch: expected {client_id}, got {aud}")
                else:
                    logger.error(f"Google tokeninfo request failed: {resp.status_code} {resp.text}")

            if not email:
                return redirect('/admin/login/?error=invalid_token')

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
                return redirect('/admin/login/?error=unauthorized')
        except Exception as e:
            logger.error(f"admin_google_login unexpected error: {e}", exc_info=True)
            return redirect('/admin/login/?error=invalid_token')
    return redirect('/admin/login/')


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

