import os
import re

files = {
    'S:/smart-kirana/frontend/src/owner/components/ImageCropper.jsx': (r'(\{modalOpen && \()', r'{modalOpen && createPortal('),
    'S:/smart-kirana/frontend/src/owner/pages/Customers.jsx': (r'(\{notifyUser && \()', r'{notifyUser && createPortal('),
    'S:/smart-kirana/frontend/src/owner/pages/Showcase.jsx': (r'(\{renamingSection && \()', r'{renamingSection && createPortal('),
}

def walk_and_replace(text):
    idx = 0
    while True:
        match = re.search(r'createPortal\(', text[idx:])
        if not match:
            break
        start = idx + match.end() - 1
        count = 1
        curr = start + 1
        while curr < len(text) and count > 0:
            if text[curr] == '(': count += 1
            elif text[curr] == ')': count -= 1
            curr += 1
        # Avoid double replacing
        if text[curr-1:curr-1+15] != ', document.body':
            text = text[:curr-1] + ', document.body' + text[curr-1:]
        idx = curr + 15
    return text

for filepath, (pattern, repl) in files.items():
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
    
    content = re.sub(pattern, repl, content)
    content = walk_and_replace(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("Done")
