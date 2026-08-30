filepath = 'frontend/src/owner/pages/Settings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '{/* AI Management Section */}' in line:
        skip = True
    if skip and 'Save Settings' in line:
        # Wait, I need to know where it ends.
        pass
        
    if not skip:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
