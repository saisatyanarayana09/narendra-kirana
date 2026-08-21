import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Fix 1: isOutOfStock ReferenceError
# Inject right after discountPercent
injection = ''' : 0;
 
 const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;'''
content = content.replace(' : 0;', injection)

# Fix 2: Broken encoding symbols
content = content.replace(',1', '\u20b9')
content = content.replace(',1{', '\u20b9{')
content = content.replace('o"', '\u2713') # checkmark
content = content.replace('A', '\u2022') # bullet

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed ProductCard ReferenceError and Encodings")
