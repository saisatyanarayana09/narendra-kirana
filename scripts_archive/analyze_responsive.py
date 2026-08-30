import os
import re

frontend_dir = 'frontend/src'

hardcoded_widths = []
tables_no_overflow = []
modals_issues = []

for root, _, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith(('.jsx', '.js', '.css', '.html')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Check for hardcoded pixel widths/heights > 300px
                matches = re.findall(r'[wh]-\[(\d{3,})px\]', content)
                for m in matches:
                    if int(m) > 300:
                        hardcoded_widths.append((file, f"w/h-[{m}px]"))
                        
                # Check for table wrappers
                if '<table' in content and 'overflow-x-auto' not in content:
                    tables_no_overflow.append(file)

print("--- Hardcoded Widths/Heights (>300px) ---")
for h in set(hardcoded_widths):
    print(f"{h[0]}: {h[1]}")

print("\n--- Tables missing overflow-x-auto ---")
for t in set(tables_no_overflow):
    print(t)

