import os

replacements = {
    '>?{': '>?{',
    'Total: ?{': 'Total: ?{',
    '?{loading': '?{loading',
    '?{totalSales': '?{totalSales',
    '?{aov': '?{aov',
    '?{product.revenue': '?{product.revenue',
    '?{parseFloat': '?{parseFloat',
    '?{order.total_amount': '?{order.total_amount',
    ' ?{': ' ?{',
    'Total Due</span><span>Rs. {': 'Total Due</span><span>?{',
    'Rs. {': '?{',
    'A ,1{': '?{',
    ',1{': '?{',
}

changed_files = []

for root, _, files in os.walk('S:/smart-kirana/frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig_content = content
            for old, new in replacements.items():
                content = content.replace(old, new)
            
            # Additional targeted fix for Sales.jsx / Dashboard.jsx
            content = content.replace('>?{', '>?{')
            content = content.replace('"?{', '"?{')
            content = content.replace(' ?{', ' ?{')

            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                changed_files.append(path)

print(f"Fixed {len(changed_files)} files")
