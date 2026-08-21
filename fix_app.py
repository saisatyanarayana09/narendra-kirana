import os

filepath = 'S:/smart-kirana/frontend/src/App.jsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace(
    "const Dashboard = React.lazy(() => import('./owner/pages/Dashboard'));", 
    "const Dashboard = React.lazy(() => import('./owner/pages/Dashboard'));\nconst Sales = React.lazy(() => import('./owner/pages/Sales'));"
)

content = content.replace(
    '<Route index element={<Dashboard />} />',
    '<Route index element={<Dashboard />} />\n          <Route path="sales" element={<Sales />} />'
)

with open(filepath, 'w') as f:
    f.write(content)
