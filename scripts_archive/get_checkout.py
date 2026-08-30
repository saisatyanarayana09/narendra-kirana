import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(export function CheckoutPage\(\) \{.*?\nexport function OrderDetailPage)', content, flags=re.DOTALL)
if match:
    with open('checkout_extract.txt', 'w', encoding='utf-8') as f:
        f.write(match.group(1))
    print("Extracted to checkout_extract.txt")
else:
    print("Not found")
