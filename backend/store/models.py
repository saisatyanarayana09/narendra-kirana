from django.db import models

class StoreSettings(models.Model):
    # General Info
    store_name = models.CharField(max_length=100, default="Narendra Kirana")
    store_address = models.TextField(blank=True, default="123 Market Street, City Center")
    store_phone = models.CharField(max_length=20, blank=True, default="+91 98765 43210")
    store_email = models.EmailField(blank=True, default="support@narendrakirana.in")
    
    # Operations
    is_open = models.BooleanField(default=True, help_text="Turn off to temporarily stop accepting orders")
    
    # Invoicing
    invoice_signature = models.ImageField(upload_to='signatures/', null=True, blank=True, help_text="Upload a signature image with a white or transparent background.")
    
    # Order Constraints
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    packaging_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Inventory
    low_stock_threshold = models.IntegerField(default=5, help_text="Alert when stock falls below this number")
    
    # Delivery (For future use or V1)
    delivery_mode = models.CharField(max_length=20, choices=[('PICKUP', 'Store Pickup Only'), ('DELIVERY', 'Delivery Only'), ('BOTH', 'Both')], default='PICKUP')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    free_delivery_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Automation
    auto_accept_orders = models.BooleanField(default=False, help_text="Automatically accept new orders")

    # Homepage Customization
    show_popular_picks = models.BooleanField(default=True)
    popular_picks_title = models.CharField(max_length=50, default="Popular picks")
    
    show_great_deals = models.BooleanField(default=True)
    great_deals_title = models.CharField(max_length=50, default="Great Deals")
    
    show_new_arrivals = models.BooleanField(default=True)
    new_arrivals_title = models.CharField(max_length=50, default="New Arrivals")

    # Homepage section display order (comma-separated section keys)
    homepage_section_order = models.CharField(
        max_length=200,
        default="popular_picks,great_deals,new_arrivals"
    )

    # Flash Announcement Theme
    announcement_bg_color = models.CharField(max_length=20, default="#ef4444")
    announcement_text_color = models.CharField(max_length=20, default="#ffffff")
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete('store_settings')

    @classmethod
    def load(cls):
        from django.core.cache import cache
        obj = cache.get('store_settings')
        if not obj:
            obj, created = cls.objects.get_or_create(pk=1)
            cache.set('store_settings', obj, timeout=3600)
        return obj

    def __str__(self):
        return f"{self.store_name} Settings"

class FlashAnnouncement(models.Model):
    text = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order', '-created_at']

    def __str__(self):
        return self.text

class HomepageSection(models.Model):
    title = models.CharField(max_length=100, default='New Section')
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    products = models.ManyToManyField(
        'products.Product',
        through='HomepageSectionProduct',
        blank=True
    )

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.title


class HomepageSectionProduct(models.Model):
    section = models.ForeignKey(HomepageSection, on_delete=models.CASCADE, related_name='section_products')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='homepage_sections')
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['position']
        unique_together = [['section', 'product']]

    def __str__(self):
        return f"{self.section.section_key} - {self.product.name} (pos {self.position})"


class Feedback(models.Model):
    customer = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating} Star - {self.customer if self.customer else 'Anonymous'}"
