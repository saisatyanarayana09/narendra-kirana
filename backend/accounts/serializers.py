from rest_framework import serializers
from django.db import transaction
from .models import User, CustomerProfile, Address

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = ['mobile_number', 'pickup_preference', 'dob', 'profile_picture', 'referral_code']

class UserSerializer(serializers.ModelSerializer):
    customer_profile = CustomerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_customer', 'is_owner', 'customer_profile', 'password', 'profile_picture']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'username': {'required': False},
            'email': {'required': False},
            'first_name': {'required': False},
        }

    profile_picture = serializers.ImageField(write_only=True, required=False)

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
            elif 'profile_picture' in profile_data:
                profile.profile_picture = profile_data['profile_picture']
                
            profile.save()
            
        return instance

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = '__all__'
        read_only_fields = ('user', 'created_at')

class CustomerSignupSerializer(serializers.ModelSerializer):
    mobile_number = serializers.CharField(max_length=15, required=True, write_only=True)
    password = serializers.CharField(write_only=True, required=True)
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
        user.set_password(password)
        user.save()
        
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
                    
                    # Create Pending Referral
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
