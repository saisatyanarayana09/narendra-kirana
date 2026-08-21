import os
import re

for root, _, files in os.walk('S:/smart-kirana/frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if '?{' in line:
                    if ' ? {' in line or ': ?' in line or '= ?' in line:
                         continue
                    print(f"{os.path.basename(path)}:{i+1}")
