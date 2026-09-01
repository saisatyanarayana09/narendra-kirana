import os

for root, dirs, files in os.walk('src/screens'):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r') as f:
                content = f.read()
            
            if 'HomeScreenNavigationProp' in content:
                content = content.replace('type HomeScreenNavigationProp', '// type HomeScreenNavigationProp')
                content = content.replace('navigation: HomeScreenNavigationProp;', 'navigation: AppNavigationProp;')
            
            with open(path, 'w') as f:
                f.write(content)
