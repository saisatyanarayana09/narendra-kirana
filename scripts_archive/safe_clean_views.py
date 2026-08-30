filepath = 'backend/products/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'def analyze_image(' in line:
        # Check if the previous line is the action decorator
        if new_lines and '@action' in new_lines[-1]:
            new_lines.pop()
        skip = True
        
    if skip and 'def generate_description(' in line:
        if new_lines and '@action' in new_lines[-1]:
            new_lines.pop()
            
    if skip and 'class FavoriteViewSet(' in line:
        skip = False
        
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
