import re

file_path = 'mobile/src/components/ProductCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change Add to Cart to ADD
content = content.replace('Add to Cart</Text>', 'ADD</Text>')
content = content.replace('Adding...</Text>', 'ADDING</Text>')
content = content.replace('Out of stock</Text>', 'UNAVAILABLE</Text>')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned ProductCard.')
