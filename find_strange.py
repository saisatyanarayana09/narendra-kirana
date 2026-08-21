import os

strange = ['₹', ',1{', 'A ', '', 'Rs. {']

for root, _, files in os.walk('S:/smart-kirana/frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            lines = content.split('\n')
            for i, line in enumerate(lines):
                for s in strange:
                    if s in line:
                        print(f"{os.path.basename(path)}:{i+1} : {line.strip()}")
