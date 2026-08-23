import os
import re

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Safe replace 2: ProductDetailPage
content = re.sub(
    r'(const discountPercent = [^\n]*:\ 0;)\s*const cartItem = cart\?',
    r'\1\n   const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;\n   const cartItem = cart?',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
