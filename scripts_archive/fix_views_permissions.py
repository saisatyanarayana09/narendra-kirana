import re
filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from accounts.permissions import IsOwnerUser',
    'from accounts.permissions import IsOwnerUser, IsOwnerOrReadOnly'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
