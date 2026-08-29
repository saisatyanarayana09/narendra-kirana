import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
    
if "MapPin" not in content:
    content = content.replace("from 'lucide-react'", ", MapPin, Edit2 } from 'lucide-react'")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
