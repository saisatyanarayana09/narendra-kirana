import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add colors to StoreSettings
store_settings_injection = """    # Flash Announcement Theme
    announcement_bg_color = models.CharField(max_length=20, default="#ef4444")
    announcement_text_color = models.CharField(max_length=20, default="#ffffff")

    def save(self, *args, **kwargs):"""
content = re.sub(r'    def save\(self, \*args, \*\*kwargs\):', store_settings_injection, content)

# Add FlashAnnouncement Model
flash_model = """
class FlashAnnouncement(models.Model):
    text = models.CharField(max_length=500, help_text="The text to display in the marquee")
    link = models.CharField(max_length=255, blank=True, null=True, help_text="Optional URL to navigate to when clicked")
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return self.text
"""
content = content + flash_model

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
