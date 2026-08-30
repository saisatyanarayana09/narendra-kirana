import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add ScanLine back to lucide-react import
content = re.sub(r"import \{ (.*?) \} from 'lucide-react';", r"import { \1, ScanLine } from 'lucide-react';", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
