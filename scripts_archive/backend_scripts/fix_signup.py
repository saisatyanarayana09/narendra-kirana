import os
import re

filepath = 'accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to inject the check right before PendingReferral creation
old_referral = """                    # Create Pending Referral
                    Referral.objects.create(
                        referrer=referrer_user,
                        referred_user=user,
                        status=Referral.Status.PENDING
                    )"""

new_referral = """                    # --- MEMORY CHECK FOR ABUSE ---
                    # Check if this mobile number belonged to a deleted account in the past
                    has_been_here_before = User.objects.filter(username__contains=f"del_{mobile_number}_").exists()
                    
                    if not has_been_here_before:
                        # Create Pending Referral ONLY if they are a truly new human
                        Referral.objects.create(
                            referrer=referrer_user,
                            referred_user=user,
                            status=Referral.Status.PENDING
                        )
                        # --- END MEMORY CHECK ---"""

content = content.replace(old_referral, new_referral)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
