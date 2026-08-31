import os
import re

icons = set()
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                for line in file:
                    m = re.search(r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react-native['\"]", line)
                    if m:
                        for icon in m.group(1).split(','):
                            i = icon.strip()
                            if i: icons.add(i)

print(sorted(list(icons)))
