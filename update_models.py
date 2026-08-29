import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove announcement colors from StoreSettings
content = re.sub(r'    # Flash Announcement Theme.*?announcement_text_color = models\.CharField\(max_length=20, default="#ffffff"\)\n', '', content, flags=re.DOTALL)

# Replace FlashAnnouncement with PromoBanner
promo_banner_model = """class PromoBanner(models.Model):
    image = models.ImageField(upload_to='promo_banners/')
    link = models.CharField(max_length=255, blank=True, null=True, help_text="Optional URL to navigate to when clicked")
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return f"Banner {self.id} (Order: {self.display_order})" """

content = re.sub(r'class FlashAnnouncement.*?return self\.text\n', promo_banner_model, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
