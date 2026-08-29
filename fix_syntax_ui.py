import os
import re

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken textContent line
content = re.sub(
    r'"textContent": f\'You are receiving this email because you requested a password reset\.\n\nPlease click the link below to set a new password:\n\{reset_link\}\'',
    '"textContent": f\"\"\"You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}\"\"\"',
    content,
    flags=re.MULTILINE
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
