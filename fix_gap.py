import re

files = [
    'mobile/src/screens/orders/InvoiceScreen.tsx',
    'owner-mobile/src/app/(tabs)/more/invoices.tsx',
    'owner-mobile/src/app/(tabs)/orders/[id].tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    content = re.sub(
        r'gap:\s*6,\s*alignItems:\s*["\']center["\'],\s*gap:\s*8,',
        'alignItems: "center",\n    gap: 8,',
        content,
        flags=re.IGNORECASE
    )

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
