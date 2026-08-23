import os
import re

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: isOutOfStock ReferenceError in ProductCard
# The definition of discountPercent is unique enough.
content = content.replace(
    'const discountPercent = product.offer_price && regPrice > offPrice \n ? Math.round(((regPrice - offPrice) / regPrice) * 100) \n : 0;', 
    'const discountPercent = product.offer_price && regPrice > offPrice \n ? Math.round(((regPrice - offPrice) / regPrice) * 100) \n : 0;\n const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;'
)

# And in ProductDetailPage (it might be on one line)
content = content.replace(
    'const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;',
    'const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;\n const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;'
)

# Fix 2: Broken encoding symbols using regex to find exactly those corrupted chunks
# Corrupt rupee: ,1{ -> \u20b9{
content = re.sub(r'[^\x00-\x7F]*,1\{', '\u20b9{', content)

# Corrupt bullet: A  -> \u2022 
content = re.sub(r' A[^\x00-\x7F]+ \}', ' \u2022 }', content)
# Or just replace the exact template string
content = content.replace('${product.brand} A ', '${product.brand} \u2022 ')
content = content.replace('${product.brand} A\ufffd ', '${product.brand} \u2022 ')

# Corrupt checkmark: o" -> \u2713
content = re.sub(r'[^\x00-\x7F]*o\" Added!', '\u2713 Added!', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed successfully")
