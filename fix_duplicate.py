import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the second import of WifiOff
duplicate = "import { useState, useEffect } from 'react';\nimport { WifiOff } from 'lucide-react';"
fixed = "import { useState, useEffect } from 'react';"
content = content.replace(duplicate, fixed)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
