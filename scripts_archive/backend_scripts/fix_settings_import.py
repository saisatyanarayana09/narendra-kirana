import os
import re

filepath = 'offers/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'from django.conf import settings' not in content:
    content = content.replace('from django.db import models', 'from django.db import models\nfrom django.conf import settings')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
