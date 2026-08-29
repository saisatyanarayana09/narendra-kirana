import os

filepath = 'frontend/src/profile/pages/SavedAddresses.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("export function SavedAddresses() {", "export default function SavedAddresses() {")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
