import re

filepath = 'backend/store/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add to StoreSettingsSerializer fields
old_fields = "fields = '__all__'"
# Actually, if it's '__all__', I don't even need to update it! Let's check what fields it has.
