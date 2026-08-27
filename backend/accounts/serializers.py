from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from .models import User, CustomerProfile, Address

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ['mobile_number', 'pickup_preference', 'dob', 'profile_picture', 'referral_code', 'delete_requested']

class UserSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_customer', 'is_owner', 'customer_profile', 'password', 'profile_picture', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False, 'validators': [validate_password]},
            'username': {'required': False},
            'email': {'required': False},
            'first_name': {'required': False},
        }

    profile_picture = serializers.ImageField(write_only=True, required=False)

    def validate_profile_picture(self, value):
        if not value:
            return value
        
        # Security: Enforce max file size (5MB)
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Profile picture cannot exceed 5MB in size.")
            
        # Security: Enforce allowed MIME types
        allowed_formats = ['image/jpeg', 'image/png', 'image/webp']
        if getattr(value, 'content_type', None) not in allowed_formats:
            raise serializers.ValidationError("Only JPEG, PNG, and WebP images are allowed.")
            
        return value

    def update(self, instance, validated_data):
        import json
        profile_data = self.initial_data.get('customer_profile', {})
        if isinstance(profile_data, str):
            try:
                profile_data = json.loads(profile_data)
            except json.JSONDecodeError:
                profile_data = {}
        
        # Update User fields
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.username = validated_data.get('username', instance.username)
        instance.email = validated_data.get('email', instance.email)
        
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            
        instance.save()

        # Update CustomerProfile fields
        if hasattr(instance, 'customer_profile'):
            profile = instance.customer_profile
            new_dob = profile_data.get('dob', profile.dob)
            if new_dob == "":
                new_dob = None
            profile.dob = new_dob
            profile.mobile_number = profile_data.get('mobile_number', profile.mobile_number)
            
            # Allow top-level profile_picture in multipart form data
            if 'profile_picture' in validated_data:
                profile.profile_picture = validated_data.pop('profile_picture')
                
            profile.save()
            
        return instance

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

class CustomerSignupSerializer(serializers.ModelSerializer):
    mobile_number = serializers.CharField(max_length=15, required=True, write_only=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    referral_code = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'email', 'password', 'mobile_number', 'referral_code']

    def validate_mobile_number(self, value):
        if CustomerProfile.objects.filter(mobile_number=value).exists():
            raise serializers.ValidationError('A customer with this mobile number already exists.')
        return value

    def validate_referral_code(self, value):
        if value:
            referrer_profile = CustomerProfile.objects.filter(referral_code=value.upper()).first()
            if not referrer_profile:
                raise serializers.ValidationError('Invalid referral code.')
            
            # Check minimum spend requirement
            from offers.models import ReferralSettings
            settings = ReferralSettings.load()
            if settings.is_active and settings.require_min_spend and settings.min_spend_amount > 0:
                from django.utils import timezone
                from datetime import timedelta
                from django.db.models import Sum
                from orders.models import Order
                
                now = timezone.now()
                if settings.min_spend_period == 'WEEK':
                    start_date = now - timedelta(days=7)
                elif settings.min_spend_period == 'YEAR':
                    start_date = now - timedelta(days=365)
                else:
                    start_date = now - timedelta(days=30) # MONTH
                    
                total_spend = Order.objects.filter(
                    customer=referrer_profile.user,
                    status=Order.Status.COMPLETED,
                    created_at__gte=start_date
                ).aggregate(total=Sum('total_amount'))['total'] or 0
                
                if total_spend < settings.min_spend_amount:
                    raise serializers.ValidationError('This referral code is not active yet.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        mobile_number = validated_data.pop('mobile_number')
        password = validated_data.pop('password')
        referral_code = validated_data.pop('referral_code', None)
        validated_data['is_customer'] = True
        validated_data['is_owner'] = False
        
        user = User.objects.create(**validated_data)
        user.is_active = False
        user.set_password(password)
        user.save()

        # Send Activation Email
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail
        from django.conf import settings
        from .utils import email_verification_token
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = email_verification_token.make_token(user)
        
        frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:5173'
        verify_link = f"{frontend_url}/verify-email?uid={uid}&token={token}"
        
        try:
            send_mail(
                'Activate Your Narendra Kirana Account',
                f'Welcome to Narendra Kirana!\n\nPlease click the link below to activate your account:\n{verify_link}',
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            print("Email sending failed:", str(e))

        
        # Profile & Wallet
        CustomerProfile.objects.create(user=user, mobile_number=mobile_number)
        from .models import Wallet, WalletTransaction
        wallet = Wallet.objects.create(user=user)

        # Handle Referral Logic
        if referral_code:
            from offers.models import ReferralSettings, Referral
            settings = ReferralSettings.load()
            if settings.is_active:
                try:
                    referrer_profile = CustomerProfile.objects.get(referral_code=referral_code.upper())
                    referrer_user = referrer_profile.user
                    
                    # --- MEMORY CHECK FOR ABUSE ---
                    # Check if this mobile number belonged to a deleted account in the past
                    has_been_here_before = User.objects.filter(username__contains=f"del_{mobile_number}_").exists()
                    
                    if not has_been_here_before:
                        # Create Pending Referral ONLY if they are a truly new human
                        Referral.objects.create(
                            referrer=referrer_user,
                            referred_user=user,
                            status=Referral.Status.PENDING
                        )
                        
                        # Issue Referee Reward instantly
                        if settings.referee_reward > 0:
                            wallet.balance += settings.referee_reward
                            wallet.save()
                            WalletTransaction.objects.create(
                                wallet=wallet,
                                amount=settings.referee_reward,
                                transaction_type=WalletTransaction.TransactionType.REFERRAL_REWARD,
                                description=f"Welcome bonus for using referral code {referral_code.upper()}"
                            )
                    # --- END MEMORY CHECK ---
                except CustomerProfile.DoesNotExist:
                    pass

        return user

from .models import Wallet, WalletTransaction

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = '__all__'

class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Wallet
        fields = ['balance', 'transactions', 'updated_at']
