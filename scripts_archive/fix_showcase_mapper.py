import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix setSections inside loadData
old_set = "setSections(secRes.data.sort((a, b) => a.display_order - b.display_order));"
new_set = """const mappedSections = secRes.data.map(sec => ({
          ...sec,
          items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
        }));
        setSections(mappedSections.sort((a, b) => a.display_order - b.display_order));"""

content = content.replace(old_set, new_set)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
