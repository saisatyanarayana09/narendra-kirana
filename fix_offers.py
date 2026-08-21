import os

filepath = 'S:/smart-kirana/frontend/src/owner/pages/Offers.jsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace('aspectRatio={3/1}', 'aspect={3}')

with open(filepath, 'w') as f:
    f.write(content)
print('Fixed Offers.jsx')
