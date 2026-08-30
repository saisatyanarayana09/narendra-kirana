import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<p className=\"text-sm leading-relaxed text-slate-600 pb-12 md:pb-0\">{product.description || 'Fresh, quality essentials from your local store.'}</p>",
    "<p className=\"text-[15px] leading-relaxed text-slate-700 whitespace-pre-line pb-12 md:pb-0\">{product.description || 'Fresh, quality essentials from your local store.'}</p>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
