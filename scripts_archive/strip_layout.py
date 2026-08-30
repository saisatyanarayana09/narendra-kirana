import re

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the thin marquee banner block
banner_ui = r' \{announcements\.length > 0 && \([\s\S]*?\)\} '
content = re.sub(banner_ui, ' ', content)

# Remove the API call from customer-layout since it's going to customer.jsx now
api_call = r'        const \[annRes, setRes\] = await Promise\.all\(\[\n          api\.get\(\'/store/promo-banners/\'\),\n          api\.get\(\'/store/settings/\'\)\n        \]\);\n        setAnnouncements\(annRes\.data\.filter\(a => a\.is_active\)\.sort\(\(a, b\) => a\.display_order - b\.display_order\)\);\n        setSettings\(setRes\.data\);'
api_call_new = """        const res = await api.get('/store/settings/');
        setSettings(res.data);"""
content = content.replace(api_call, api_call_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
