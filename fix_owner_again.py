import os
import re

filepath = 'S:/smart-kirana/frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken JS
broken = "const title = BROADCAST::;"
fixed = "const title = `BROADCAST::${broadcastText}`;"
content = content.replace(broken, fixed)

broken2 = "api.patch(/store/homepage-sections//, { title, is_active: active });"
fixed2 = "api.patch(`/store/homepage-sections/${broadcast.id}/`, { title, is_active: active });"
content = content.replace(broken2, fixed2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
