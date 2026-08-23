import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8', errors='replace')

# The rupee artifact is ,1{price} and ,1{product.regular_price}
# Let's just find ,1{price} and replace its preceding char
content = content.replace(',1{price}', '\u20b9{price}')
content = content.replace(',1{product.regular_price}', '\u20b9{product.regular_price}')
content = content.replace('o" Added!', '\u2713 Added!')
content = content.replace('A }', '\u2022 }')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Artifacts fixed")
