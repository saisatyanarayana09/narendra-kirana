import re

filepath = 'backend/config/settings.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace REST_FRAMEWORK defaults
old = '''REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),'''

new = '''REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),'''

content = content.replace(old, new)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
