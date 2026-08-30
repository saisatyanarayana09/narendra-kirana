import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'rb') as f:
    content = f.read()

idx = content.find(b'{price}</span>')
if idx != -1:
    print(content[idx-20:idx].decode('utf-8', errors='replace'))
    print(content[idx-10:idx])
