from rest_framework import serializers
from .models import StoreSettings, HomepageSection, HomepageSectionProduct, Feedback, StoreEmailSettings
from products.serializers import ProductSerializer


class StoreEmailSettingsSerializer(serializers.ModelSerializer):
    app_password = serializers.CharField(required=False, allow_blank=True)
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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Fallback sender email to store settings if blank
        if not data.get('sender_email'):
            try:
                from .models import StoreSettings
                s = StoreSettings.load()
                data['sender_email'] = s.store_email or ""
            except Exception:
                pass
        # Decrypt password so the store owner can view and manage their App Password
        data['app_password'] = instance.get_decrypted_password() or ""
        return data

    def update(self, instance, validated_data):
        raw_password = validated_data.pop('app_password', None)
        if raw_password is not None:
            raw_password_str = raw_password.strip()
            if raw_password_str:
                # Avoid overwriting if masked placeholder bullets are submitted
                if not all(c in ('•', '*') for c in raw_password_str):
                    instance.set_app_password(raw_password_str)
            else:
                instance.encrypted_app_password = ""
        return super().update(instance, validated_data)



class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = '__all__'

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        import json
        for img_field in ['invoice_signature', 'upi_qr_image', 'festive_popup_image', 'app_icon']:
            if img_field in data:
                sig = data.get(img_field)
                if isinstance(sig, str) or sig is None:
                    data.pop(img_field, None)

        for json_field in ['store_timings_json', 'time_slots_json']:
            if json_field in data and isinstance(data[json_field], str):
                try:
                    data[json_field] = json.loads(data[json_field])
                except Exception:
                    pass

        if 'allowed_pincodes' in data and data.get('allowed_pincodes') is None:
            data['allowed_pincodes'] = ''

        if 'low_stock_threshold' in data and (data.get('low_stock_threshold') is None or data.get('low_stock_threshold') == ''):
            data['low_stock_threshold'] = 5

        for dec_field in ['min_order_amount', 'packaging_fee', 'delivery_fee', 'free_delivery_threshold', 'min_delivery_order_amount']:
            if dec_field in data and (data.get(dec_field) is None or data.get(dec_field) == ''):
                data[dec_field] = '0.00'

        for str_field in ['store_name', 'store_phone', 'store_email']:
            if str_field in data and isinstance(data.get(str_field), str):
                data[str_field] = data[str_field].strip()

        if 'store_phone' in data and isinstance(data.get('store_phone'), str):
            data['store_phone'] = data['store_phone'][:20]

        return super().to_internal_value(data)


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
