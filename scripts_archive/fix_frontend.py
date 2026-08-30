import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_analyze = '''        setFormData(prev => ({
           ...prev,
           name: res.data.data.name || prev.name,
           brand: res.data.data.brand || prev.brand,
           unit: res.data.data.unit || prev.unit
         }));'''

good_analyze = '''        setFormData(prev => ({
           ...prev,
           name: res.data.data.name || prev.name,
           brand: res.data.data.brand || prev.brand,
           unit: res.data.data.unit || prev.unit,
           sku: res.data.data.sku || prev.sku,
           expiry_date: res.data.data.expiry_date || prev.expiry_date,
           regular_price: res.data.data.regular_price || prev.regular_price
         }));'''

if bad_analyze in content:
    content = content.replace(bad_analyze, good_analyze)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed analyze")
else:
    print("Not found analyze")
