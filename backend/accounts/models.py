from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    is_customer = models.BooleanField(default=True)
    is_owner = models.BooleanField(default=False)
    
    # We use Django's default 'username' for login, which can store a mobile number or email
    
    def __str__(self):
        return self.username

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    mobile_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    pickup_preference = models.CharField(max_length=50, blank=True, null=True, help_text="e.g., ASAP, 30 minutes, 1 hour")
    referral_code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    delete_requested = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.referral_code:
            from django.utils.crypto import get_random_string
            while True:
                code = get_random_string(8).upper()
                if not CustomerProfile.objects.filter(referral_code=code).exists():
                    self.referral_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profile: {self.user.username}"

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    title = models.CharField(max_length=50, default="Home")
    street = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    zip_code = models.CharField(max_length=20, verbose_name="Pincode")
    is_default = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet ({self.user.username}): Rs. {self.balance}"

class WalletTransaction(models.Model):
    class TransactionType(models.TextChoices):
        REFERRAL_REWARD = 'REFERRAL_REWARD', 'Referral Reward'
        MILESTONE_BONUS = 'MILESTONE_BONUS', 'Milestone Bonus'
        PURCHASE_DEDUCTION = 'PURCHASE_DEDUCTION', 'Purchase Deduction'
        REFUND = 'REFUND', 'Refund'
        ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT', 'Admin Adjustment'

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Positive for credit, negative for debit")
    transaction_type = models.CharField(max_length=30, choices=TransactionType.choices)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type}: {self.amount} for {self.wallet.user.username}"
