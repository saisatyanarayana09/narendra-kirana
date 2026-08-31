import os

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # The exact string added by PowerShell accidentally
            bad_str = "`nimport { Image } from 'expo-image';"
            good_str = "\nimport { Image } from 'expo-image';"
            
            new_content = content.replace(bad_str, good_str)
            
            if content != new_content:
                print(f"Fixed {path}")
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
