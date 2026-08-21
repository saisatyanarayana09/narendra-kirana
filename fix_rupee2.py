import os
import re

files_to_fix = [
    'S:/smart-kirana/frontend/src/cart.jsx',
    'S:/smart-kirana/frontend/src/customer-layout.jsx',
    'S:/smart-kirana/frontend/src/customer.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Dashboard.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Offers.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Sales.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Invoice.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Orders.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/OrderDetails.jsx',
    'S:/smart-kirana/frontend/src/profile/pages/Wallet.jsx',
    'S:/smart-kirana/frontend/src/profile/pages/OrdersHistory.jsx',
]

changed = []
for path in files_to_fix:
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig = content
    
    # Fix all broken patterns where ? is used as rupee sign before { or digits
    # Pattern: standalone ? immediately before { (not part of ternary like ' ? {')
    # We need to be careful not to break ternary operators
    
    # Replace 'Rs. {' with rupee symbol
    content = content.replace('Rs. {', '\u20b9{')
    
    # Replace '>?{' patterns (inside JSX text nodes)
    content = content.replace('>?\u200b{', '>\u20b9{')
    content = content.replace('>?{', '>\u20b9{')
    
    # Replace patterns like: ')?\u200b{' or ')?{' that are money displays
    # But NOT ternary patterns like ' ? {' or '? (' etc.
    
    # Fix specific known patterns
    content = content.replace('Total: ?{', 'Total: \u20b9{')
    content = content.replace(' ?{order', ' \u20b9{order')
    content = content.replace(' ?{totalSales', ' \u20b9{totalSales')
    content = content.replace(' ?{aov', ' \u20b9{aov')
    content = content.replace(' ?{product.revenue', ' \u20b9{product.revenue')
    content = content.replace(' ?{loading', ' \u20b9{loading')
    content = content.replace('\"?{', '\"\u20b9{')
    
    # Fix wallet page patterns
    content = content.replace('}?\u200b{parseFloat', '}\u20b9{parseFloat')
    content = content.replace('}?{parseFloat', '}\u20b9{parseFloat')
    content = content.replace('          ?{parseFloat', '          \u20b9{parseFloat')
    
    # Fix the common pattern: text?>? or >)?
    # Use regex: replace ?>{ at start of a display context
    content = re.sub(r'(?<=[>\s])\?(\{(?:parseFloat|order|cart|item|loading|totalSales|aov|product|analytics|wallet))', r'\u20b9\1', content)
    
    # Fix remaining isolated ?{ that are clearly rupee (after > or space, before a variable)
    content = re.sub(r'(?<=[>\"\s])\?\{', '\u20b9{', content)
    
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        changed.append(os.path.basename(path))

print(f'Fixed: {", ".join(changed) if changed else "none"}')
