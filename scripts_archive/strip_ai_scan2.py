filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'const handleAIPhotoUpload =' in line:
        skip = True
    if skip and '    };' in line:
        skip = False
        continue
    
    if skip:
        continue
        
    if 'id="ai-photo-upload"' in line or 'onClick={() => document.getElementById(\'ai-photo-upload\').click()}' in line or 'AI Scan' in line:
        continue
        
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
