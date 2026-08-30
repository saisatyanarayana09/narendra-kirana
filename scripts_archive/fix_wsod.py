import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The UI block is still there, I will aggressively remove it.
# It starts with {/* Smart AI Creation Panel */} and ends right before <div className="flex items-center space-x-6 pt-4 md:col-span-2">

pattern = r'\s*\{\/\* Smart AI Creation Panel \*\/\}.*?(?=<div className="flex items-center space-x-6 pt-4 md:col-span-2">)'
content = re.sub(pattern, '\n', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
