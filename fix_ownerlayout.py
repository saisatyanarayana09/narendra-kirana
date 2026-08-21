import os

filepath = 'S:/smart-kirana/frontend/src/owner/layouts/OwnerLayout.jsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace(
    "Layout, Gift } from 'lucide-react';",
    "Layout, Gift, TrendingUp } from 'lucide-react';"
)

content = content.replace(
    "{ name: 'Dashboard', href: '/owner', icon: LayoutDashboard },",
    "{ name: 'Dashboard', href: '/owner', icon: LayoutDashboard },\n    { name: 'Sales', href: '/owner/sales', icon: TrendingUp },"
)

with open(filepath, 'w') as f:
    f.write(content)
