import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<div className={overflow-hidden bg-slate-50 relative rounded-t-2xl }>',
                          '<div className={`overflow-hidden bg-slate-50 relative rounded-t-2xl ${isOutOfStock ? "grayscale opacity-80" : ""}`}>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
