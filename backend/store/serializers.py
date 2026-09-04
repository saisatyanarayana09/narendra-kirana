from rest_framework import serializers
from .models import StoreSettings, HomepageSection, HomepageSectionProduct, Feedback, StoreEmailSettings
from products.serializers import ProductSerializer


class StoreEmailSettingsSerializer(serializers.ModelSerializer):
    app_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    has_password = serializers.SerializerMethodField()
    masked_password = serializers.SerializerMethodField()

    class Meta:
        model = StoreEmailSettings
        fields = [
            'id',
            'provider',
            'sender_email',
            'sender_name',
            'smtp_host',
            'smtp_port',
            'use_tls',
            'use_ssl',
            'is_active',
            'app_password',
            'has_password',
            'masked_password',
            'last_tested_at',
            'last_test_status',
        ]
        read_only_fields = ['id', 'has_password', 'masked_password', 'last_tested_at', 'last_test_status']

    def get_has_password(self, obj):
        return bool(obj.encrypted_app_password)

    def get_masked_password(self, obj):
        if not obj.encrypted_app_password:
            return ""
        return "••••••••••••••••"

    def update(self, instance, validated_data):
        raw_password = validated_data.pop('app_password', None)
        if raw_password and raw_password.strip():
            instance.set_app_password(raw_password.strip())
        return super().update(instance, validated_data)



class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
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
        fields = ['id', 'title', 'section_type', 'banner_image', 'banner_link', 'display_order', 'is_active', 'section_products']

class FeedbackSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True, default='Anonymous')
    
    class Meta:
        model = Feedback
        fields = ['id', 'rating', 'comments', 'created_at', 'customer_name']
        read_only_fields = ['created_at']
