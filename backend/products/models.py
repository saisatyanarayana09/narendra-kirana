from django.db import models
from django.utils.text import slugify
from django.conf import settings

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='category_images/', blank=True, null=True)
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    unit = models.CharField(max_length=50, help_text="e.g., 1 kg, 500 g, 1 L")
    regular_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="MRP")
    offer_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name="Special Price")
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_in_stock = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(default=0, help_text="Available stock quantity")
    max_order_quantity = models.IntegerField(default=10, blank=True, null=True, help_text="Max items a user can order at once")
    sku = models.CharField(max_length=100, blank=True, null=True, help_text="Barcode / SKU")
    expiry_date = models.DateField(blank=True, null=True)
    tags = models.CharField(max_length=200, blank=True, null=True, help_text="Comma separated tags (e.g., Bestseller, Organic)")
    display_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.unit}"

class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"
