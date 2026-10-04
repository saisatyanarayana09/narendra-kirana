import re

files = [
    'owner-mobile/src/app/(tabs)/more/invoices.tsx',
    'owner-mobile/src/app/(tabs)/orders/[id].tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Wrap in Boolean()
    content = content.replace(
        '{(storeSettings?.gstin || storeSettings?.fssai_license_number) && (',
        '{Boolean(storeSettings?.gstin || storeSettings?.fssai_license_number) && ('
    )

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Fixed empty string leaks.')
