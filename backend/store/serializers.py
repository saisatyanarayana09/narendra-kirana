from rest_framework import serializers
from .models import StoreSettings, Feedback, HomepageSection, HomepageSectionProduct


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = '__all__'


class FeedbackSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)

    class Meta:
        model = Feedback
        fields = ['id', 'customer', 'customer_name', 'customer_email', 'rating', 'comments', 'created_at']
        read_only_fields = ['id', 'customer', 'created_at']


class HomepageSectionProductSerializer(serializers.ModelSerializer):
    """Serializes a product within a section, including the position and key product fields."""
    id = serializers.IntegerField(source='product.id')
    name = serializers.CharField(source='product.name', read_only=True)
    image = serializers.ImageField(source='product.image', read_only=True)
    regular_price = serializers.DecimalField(source='product.regular_price', max_digits=10, decimal_places=2, read_only=True)
    offer_price = serializers.DecimalField(source='product.offer_price', max_digits=10, decimal_places=2, read_only=True)
    is_in_stock = serializers.BooleanField(source='product.is_in_stock', read_only=True)

    class Meta:
        model = HomepageSectionProduct
        fields = ['id', 'name', 'image', 'regular_price', 'offer_price', 'is_in_stock', 'position']


class HomepageSectionSerializer(serializers.ModelSerializer):
    """Serializes a homepage section with its ordered product list."""
    items = HomepageSectionProductSerializer(source='section_products', many=True, read_only=True)
    # Write-only: accepts list of product IDs in desired order
    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = HomepageSection
        fields = ['id', 'title', 'display_order', 'is_active', 'items', 'product_ids']
        read_only_fields = ['id']

    def update(self, instance, validated_data):
        product_ids = validated_data.pop('product_ids', None)
        if product_ids is not None:
            # Clear existing and rebuild with new positions
            HomepageSectionProduct.objects.filter(section=instance).delete()
            for position, product_id in enumerate(product_ids):
                HomepageSectionProduct.objects.create(
                    section=instance,
                    product_id=product_id,
                    position=position
                )
        return instance
