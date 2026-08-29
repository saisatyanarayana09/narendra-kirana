import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if 'const handleAnalyzeProduct = async () => {' in line:
        skip = True
    if skip and 'const handleSubmit = async (e) => {' in line:
        skip = False
        
    if skip:
        continue
        
    if '<div className="md:col-span-2 mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm">' in line:
        skip = True
    if skip and '</div>' in line and '</div>' in lines[i+1] and '<div className="flex items-center space-x-6 pt-4 md:col-span-2">' in lines[i+2]:
        # wait, let me use regex for the UI block
        pass
        
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

# Now regex the UI block since line-by-line is risky
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    
# Find the exact string starting from <div className="md:col-span-2 mt-4 bg-gradient-to-br...
# up to the end of that block before <div className="flex items-center space-x-6 pt-4 md:col-span-2">
content = re.sub(r'<div className="md:col-span-2 mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 shadow-sm">.*?(?=<div className="flex items-center space-x-6 pt-4 md:col-span-2">)', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
