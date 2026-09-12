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
        # Ensure we work with a standard mutable Python dict (not QueryDict)
        if hasattr(data, 'dict'):
            clean_data = data.dict()
        elif hasattr(data, 'copy'):
            clean_data = dict(data.copy())
        elif isinstance(data, dict):
            clean_data = dict(data)
        else:
            clean_data = {}

        import json
        import ast

        for img_field in ['invoice_signature', 'upi_qr_image', 'festive_popup_image', 'app_icon']:
            if img_field in clean_data:
                sig = clean_data.get(img_field)
                if isinstance(sig, str) or sig is None:
                    clean_data.pop(img_field, None)

        for json_field, default_factory in [('store_timings_json', dict), ('time_slots_json', list)]:
            if json_field in clean_data:
                val = clean_data.get(json_field)
                if isinstance(val, str):
                    val = val.strip()
                    if not val or val in ('null', 'undefined', '[object Object]', "''", '""'):
                        clean_data[json_field] = default_factory()
                    else:
                        try:
                            clean_data[json_field] = json.loads(val)
                        except Exception:
                            try:
                                parsed = ast.literal_eval(val)
                                clean_data[json_field] = parsed if isinstance(parsed, (dict, list)) else default_factory()
                            except Exception:
                                clean_data[json_field] = default_factory()
                elif val is None:
                    clean_data[json_field] = default_factory()

        if 'allowed_pincodes' in clean_data and clean_data.get('allowed_pincodes') is None:
            clean_data['allowed_pincodes'] = ''

        if 'low_stock_threshold' in clean_data and (clean_data.get('low_stock_threshold') is None or clean_data.get('low_stock_threshold') == ''):
            clean_data['low_stock_threshold'] = 5

        for dec_field in ['min_order_amount', 'packaging_fee', 'delivery_fee', 'free_delivery_threshold', 'min_delivery_order_amount']:
            if dec_field in clean_data and (clean_data.get(dec_field) is None or clean_data.get(dec_field) == ''):
                clean_data[dec_field] = '0.00'

        for str_field in ['store_name', 'store_phone', 'store_email']:
            if str_field in clean_data and isinstance(clean_data.get(str_field), str):
                clean_data[str_field] = clean_data[str_field].strip()

        if 'store_phone' in clean_data and isinstance(clean_data.get('store_phone'), str):
            clean_data['store_phone'] = clean_data['store_phone'][:20]

        return super().to_internal_value(clean_data)

    def validate_store_timings_json(self, value):
        if isinstance(value, str):
            import json, ast
            try:
                value = json.loads(value)
            except Exception:
                try:
                    value = ast.literal_eval(value)
                except Exception:
                    value = {}
        if not isinstance(value, dict):
            return {}
        return value

    def validate_time_slots_json(self, value):
        if isinstance(value, str):
            import json, ast
            try:
                value = json.loads(value)
            except Exception:
                try:
                    value = ast.literal_eval(value)
                except Exception:
                    value = []
        if not isinstance(value, list):
            return []
        return value


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
