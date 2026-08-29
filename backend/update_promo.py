import os

filepath = 'offers/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add max_uses_per_user to PromoCode
old_code_def = """    expiration_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)"""

new_code_def = """    expiration_date = models.DateTimeField(blank=True, null=True)
    max_uses_per_user = models.IntegerField(default=1, help_text="0 means unlimited uses per user")
    created_at = models.DateTimeField(auto_now_add=True)"""

if 'max_uses_per_user' not in content:
    content = content.replace(old_code_def, new_code_def)

# Add PromoUsage model
promo_usage_model = """
class PromoUsage(models.Model):
    promo_code = models.ForeignKey(PromoCode, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='promo_usages')
    used_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-used_at']
"""

if 'class PromoUsage' not in content:
    content += promo_usage_model

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
