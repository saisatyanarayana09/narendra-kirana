import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setSections inside useEffect
old_set = "api.get('/store/homepage-sections/').then(r => { const d = r.data.results || r.data || []; setSections(d.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order)); }).catch(console.error).finally(tick);"
new_set = """api.get('/store/homepage-sections/').then(r => { 
          const d = r.data.results || r.data || []; 
          const mapped = d.map(sec => ({
            ...sec,
            items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
          }));
          setSections(mapped.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order)); 
        }).catch(console.error).finally(tick);"""

content = content.replace(old_set, new_set)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
