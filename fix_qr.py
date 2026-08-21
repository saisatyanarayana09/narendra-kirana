import os
import re

filepath = 'S:/smart-kirana/frontend/src/owner/components/QRScanner.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'createPortal' not in content:
    lines = content.split('\n')
    last_import = 0
    for i, l in enumerate(lines):
        if l.startswith('import '):
            last_import = i
    lines.insert(last_import + 1, "import { createPortal } from 'react-dom';")
    content = '\n'.join(lines)

content = content.replace('return (', 'return createPortal(')
content = content.replace(');', '), document.body);')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done QR")
