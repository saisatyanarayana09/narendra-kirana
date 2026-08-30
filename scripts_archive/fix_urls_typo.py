import re

filepath = 'backend/store/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'router\.register\(r\'announcements\', basename=\'announcements\'\)\n?', '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
