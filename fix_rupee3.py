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
    
    content = content.replace('Rs. {', '\u20b9{')
    content = content.replace('>?{', '>\u20b9{')
    content = content.replace('Total: ?{', 'Total: \u20b9{')
    content = content.replace('"?{', '"\u20b9{')
    
    # Wallet specific
    content = content.replace('}?{parseFloat', '}\u20b9{parseFloat')
    content = content.replace('          ?{parseFloat', '          \u20b9{parseFloat')
    
    # Regex replaces
    content = re.sub(r'(?<=[>\s])\?(\{(?:parseFloat|order|cart|item|loading|totalSales|aov|product|analytics|wallet|price))', '\u20b9\\1', content)
    content = re.sub(r'(?<=[>\"\s])\?\{', '\u20b9{', content)
    
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        changed.append(os.path.basename(path))

print(f'Fixed: {", ".join(changed) if changed else "none"}')
