import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the UI section
ui_pattern = r'<div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm">.*?</div>\s*</div>\s*</div>'
content = re.sub(ui_pattern, '', content, flags=re.DOTALL)

# Remove functions
content = re.sub(r'  const handleAnalyzeProduct = async \(\) => \{.*?\n      \}\n    \};\n', '', content, flags=re.DOTALL)
content = re.sub(r'  const handleGenerateDescription = async \(\) => \{.*?\n      \}\n    \};\n', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
