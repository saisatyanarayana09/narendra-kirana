from rest_framework import serializers
from .models import StoreSettings, HomepageSection, HomepageSectionProduct, Feedback, FlashAnnouncement
from products.serializers import ProductSerializer

class FlashAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashAnnouncement
        fields = '__all__'

class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = '__all__'

class FlashAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashAnnouncement
        fields = '__all__'

class HomepageSectionProductSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source='product', read_only=True)
    product_id = serializers.IntegerField(source='product.id', write_only=True)

    class Meta:
        model = HomepageSectionProduct
        fields = ['id', 'product_id', 'position', 'product_details']

class HomepageSectionSerializer(serializers.ModelSerializer):
    section_products = HomepageSectionProductSerializer(many=True, read_only=True)

    class Meta:
        model = HomepageSection
        fields = ['id', 'title', 'display_order', 'is_active', 'section_products']

class FeedbackSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True, default='Anonymous')
    
    class Meta:
        model = Feedback
        fields = ['id', 'rating', 'comments', 'created_at', 'customer_name']
        read_only_fields = ['created_at']
