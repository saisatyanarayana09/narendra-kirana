import re

filepath = 'frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '      {/* Broadcast Banner Tool */}'
end_str = '        {/* Action Center */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
