import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Safe replace 1: ProductCard
content = content.replace(
    'const discountPercent = product.offer_price && regPrice > offPrice \n ? Math.round(((regPrice - offPrice) / regPrice) * 100) \n : 0;\n\n const handleAddToCart',
    'const discountPercent = product.offer_price && regPrice > offPrice \n ? Math.round(((regPrice - offPrice) / regPrice) * 100) \n : 0;\n const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;\n\n const handleAddToCart'
)

# Safe replace 2: ProductDetailPage
content = content.replace(
    'const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;\n   \n   const cartItem',
    'const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;\n   const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;\n   const cartItem'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Safely injected isOutOfStock")
