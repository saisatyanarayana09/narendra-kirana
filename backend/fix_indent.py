import os
import re

filepath = 'accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """                    # --- MEMORY CHECK FOR ABUSE ---
                    # Check if this mobile number belonged to a deleted account in the past
                    has_been_here_before = User.objects.filter(username__contains=f"del_{mobile_number}_").exists()
                    
                    if not has_been_here_before:
                        # Create Pending Referral ONLY if they are a truly new human
                        Referral.objects.create(
                            referrer=referrer_user,
                            referred_user=user,
                            status=Referral.Status.PENDING
                        )
                        # --- END MEMORY CHECK ---
                    
                    # Issue Referee Reward instantly
                    if settings.referee_reward > 0:
                        wallet.balance += settings.referee_reward
                        wallet.save()
                        WalletTransaction.objects.create(
                            wallet=wallet,
                            amount=settings.referee_reward,
                            transaction_type=WalletTransaction.TransactionType.REFERRAL_REWARD,
                            description=f"Welcome bonus for using referral code {referral_code.upper()}"
                        )"""

new_logic = """                    # --- MEMORY CHECK FOR ABUSE ---
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
                    # --- END MEMORY CHECK ---"""

content = content.replace(old_logic, new_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
