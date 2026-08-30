import os
import re

frontend_dir = 'frontend/src'

replacements = [
    (r'w-\[400px\]', r'w-full max-w-[400px]'),
    (r'w-\[500px\]', r'w-full max-w-[500px]'),
    (r'w-\[600px\]', r'w-full max-w-[600px]'),
]

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css', '.html')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original = content
            for old, new in replacements:
                content = re.sub(old, new, content)
                
            if content != original:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Updated {file}")
