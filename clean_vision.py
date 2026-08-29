filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'def vision_lookup(' in line:
        if new_lines and '@action' in new_lines[-1]:
            new_lines.pop()
        skip = True
    
    if skip and 'def reorder(' in line:
        if new_lines and '@action' in new_lines[-1]:
            new_lines.pop()
        skip = False
        
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
