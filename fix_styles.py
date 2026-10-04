import re

files = [
    'mobile/src/screens/orders/InvoiceScreen.tsx',
    'owner-mobile/src/app/(tabs)/more/invoices.tsx',
    'owner-mobile/src/app/(tabs)/orders/[id].tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()

    # docTopHeader
    content = re.sub(
        r'docTopHeader:\s*\{[^}]*borderBottomWidth:\s*1,[^}]*marginBottom:\s*14,[^}]*gap:\s*14,\s*\},',
        '''docTopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 16,
    marginBottom: 14,
    gap: 8,
  },''',
        content,
        flags=re.IGNORECASE
    )

    # docStoreCol
    content = re.sub(
        r'docStoreCol:\s*\{\s*gap:\s*6,\s*\},',
        '''docStoreCol: {
    flex: 1,
    alignItems: "flex-start",
    gap: 6,
  },''',
        content,
        flags=re.IGNORECASE
    )

    # docMetaCol
    content = re.sub(
        r'docMetaCol:\s*\{\s*gap:\s*6,\s*\},',
        '''docMetaCol: {
    alignItems: "flex-end",
    gap: 4,
  },''',
        content,
        flags=re.IGNORECASE
    )

    # docMetaHeadingRow
    content = re.sub(
        r'docMetaHeadingRow:\s*\{[^}]*justifyContent:\s*["\']space-between["\'],[^}]*gap:\s*8,\s*\},',
        '''docMetaHeadingRow: {
    alignItems: "flex-end",
    gap: 2,
  },''',
        content,
        flags=re.IGNORECASE
    )

    # docMetaRow
    content = re.sub(
        r'docMetaRow:\s*\{\s*flexDirection:\s*["\']row["\'],\s*justifyContent:\s*["\']space-between["\'],',
        '''docMetaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,''',
        content,
        flags=re.IGNORECASE
    )

    # docTaxInvoiceHeading
    content = re.sub(
        r'docTaxInvoiceHeading:\s*\{\s*fontSize:\s*22,',
        '''docTaxInvoiceHeading: {
    fontSize: 16,''',
        content,
        flags=re.IGNORECASE
    )

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print('Updated UI layout styles.')
