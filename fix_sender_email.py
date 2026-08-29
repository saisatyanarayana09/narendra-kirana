import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the sender_email logic
old_line = "sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'saisatyanarayana2004@gmail.com')"
new_line = "sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'saisatyanarayana2004@gmail.com'"

content = content.replace(old_line, new_line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
