import re

filepath = 'backend/accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the broken multiline f-string with a properly escaped one
pattern = r"f'Welcome to Narendra Kirana!\n\n  Please click the link below to activate your account:\n  \{verify_link\}'"
replacement = "f'Welcome to Narendra Kirana!\\n\\nPlease click the link below to activate your account:\\n{verify_link}'"

content = re.sub(pattern, replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
