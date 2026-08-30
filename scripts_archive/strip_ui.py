filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '<div className="md:col-span-2 mt-4 bg-gradient-to-br' in line:
        skip = True
    if skip and '<div className="flex items-center space-x-6 pt-4 md:col-span-2">' in line:
        skip = False
        
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
