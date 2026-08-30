import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the import
if 'const Welcome =' not in content:
    content = content.replace("const Dashboard = React.lazy(() => import('./owner/pages/Dashboard'));", "const Welcome = React.lazy(() => import('./owner/pages/Welcome'));\n  const Dashboard = React.lazy(() => import('./owner/pages/Dashboard'));")

# Add the route
if '<Route path="welcome" element={<Welcome />} />' not in content:
    content = content.replace('<Route index element={<Dashboard />} />', '<Route index element={<Dashboard />} />\n            <Route path="welcome" element={<Welcome />} />')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
