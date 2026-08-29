import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# First, reset the file since it's messed up again
