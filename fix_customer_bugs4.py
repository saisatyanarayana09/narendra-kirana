import os
import re

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'>(?:[^\x00-\x7F]|,)*1\{price\}', '>\u20b9{price}', content)
content = re.sub(r'>(?:[^\x00-\x7F]|,)*1\{product\.regular_price\}', '>\u20b9{product.regular_price}', content)
content = re.sub(r'\?\s*\'(?:[^\x00-\x7F]|o|\"|\s)*Added!\'', "? '\u2713 Added!'", content)
content = re.sub(r'\$\{(?:[^\x00-\x7F]|A| )*\\}', ' \u2022 }', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Regex replace applied")
