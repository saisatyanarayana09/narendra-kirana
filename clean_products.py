import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove handleEnhanceImage entirely
pattern_enhance = re.compile(r'\s*const handleEnhanceImage = async \(\) => \{[\s\S]*?(?=\s*const closeForm = \(\) => \{)', re.DOTALL)
content = pattern_enhance.sub('\n', content)

# 2. Remove {enhancedPreview && ... } block entirely
pattern_preview = re.compile(r'\s*\{enhancedPreview && \([\s\S]*?\}\)[\s\S]*?(?=<div className="flex items-center space-x-6 pt-4 md:col-span-2">)', re.DOTALL)
content = pattern_preview.sub('\n', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed unused variables and blocks")
