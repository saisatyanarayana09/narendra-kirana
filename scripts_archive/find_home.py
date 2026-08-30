import os

with open('S:/smart-kirana/frontend/src/customer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'Categories' in line:
        print(f"{i}: {line.strip()}")
