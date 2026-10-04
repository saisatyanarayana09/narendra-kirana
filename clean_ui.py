import re

file_path = 'mobile/src/screens/products/ProductListScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove subHeaderRow completely
content = re.sub(
    r'<View style=\{\[styles\.subHeaderRow, \{ borderTopColor: colors\.border \}\]\}>.*?</View>',
    '',
    content,
    flags=re.IGNORECASE | re.DOTALL
)

# Remove 'Back' text from top bar
content = re.sub(
    r'<Text style=\{\[styles\.backButtonText, \{ color: colors\.primary \}\]\}>\s*\{t\("back"\)\}\s*</Text>',
    '',
    content,
    flags=re.IGNORECASE | re.DOTALL
)

# Simplify sorting labels
content = content.replace('"Price: Low to High"', '"Price: Low-High"')
content = content.replace('"Price: High to Low"', '"Price: High-Low"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned ProductListScreen.')
