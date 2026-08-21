import os
import glob

bad_chars = ['', '?', 'Rs. ']

for root, _, files in os.walk('S:/smart-kirana/frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                
            for i, line in enumerate(content.split('\n')):
                if '' in line or '?' in line:
                    if '?' in line and '{' not in line and '}' not in line and not line.strip().startswith('?') and not '?:' in line:
                         pass
                    # Let's just print lines with '?' before '{' or numbers, or lines with ''
                    if '?{' in line or '' in line:
                        print(f"{path}:{i+1}: {line.strip()}")
