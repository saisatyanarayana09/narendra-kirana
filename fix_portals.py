import os
import re

files_to_fix = [
    'S:/smart-kirana/frontend/src/owner/components/HomepageSectionEditor.jsx',
    'S:/smart-kirana/frontend/src/owner/components/ImageCropper.jsx',
    'S:/smart-kirana/frontend/src/owner/components/QRScanner.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Customers.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Offers.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Products.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Referrals.jsx',
    'S:/smart-kirana/frontend/src/owner/pages/Showcase.jsx'
]

for filepath in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'createPortal' not in content:
        lines = content.split('\n')
        # find last import
        last_import = 0
        for i, l in enumerate(lines):
            if l.startswith('import '):
                last_import = i
        lines.insert(last_import + 1, "import { createPortal } from 'react-dom';")
        content = '\n'.join(lines)
        
    # Replace the exact patterns:
    content = re.sub(r'(\{pickerOpen && \()', r'{pickerOpen && createPortal(', content)
    content = re.sub(r'(\{isCropping && \()', r'{isCropping && createPortal(', content)
    content = re.sub(r'(\{isScanning && \()', r'{isScanning && createPortal(', content)
    content = re.sub(r'(\{isViewOpen && selectedCustomer && \()', r'{isViewOpen && selectedCustomer && createPortal(', content)
    content = re.sub(r'(\{isPromoModalOpen && \()', r'{isPromoModalOpen && createPortal(', content)
    content = re.sub(r'(\{isBannerModalOpen && \()', r'{isBannerModalOpen && createPortal(', content)
    content = re.sub(r'(\{isFormOpen && \()', r'{isFormOpen && createPortal(', content)
    content = re.sub(r'(\{isAddSectionOpen && \()', r'{isAddSectionOpen && createPortal(', content)
    content = re.sub(r"(\{scannedReferralId && scannedReferral && scannedReferral\.status === 'AWAITING_APPROVAL' && \()", r"{scannedReferralId && scannedReferral && scannedReferral.status === 'AWAITING_APPROVAL' && createPortal(", content)
    content = re.sub(r"(\{scannedReferralId && scannedReferral && scannedReferral\.status !== 'AWAITING_APPROVAL' && \()", r"{scannedReferralId && scannedReferral && scannedReferral.status !== 'AWAITING_APPROVAL' && createPortal(", content)

    # Now we have changed {condition && createPortal(.
    # We need to find the matching closing paren )} for each portal and replace with ), document.body)}
    # Since regex can't match brackets easily, we will do a manual walk.
    
    def walk_and_replace(text):
        idx = 0
        while True:
            # find createPortal(
            match = re.search(r'createPortal\(', text[idx:])
            if not match:
                break
            start = idx + match.end() - 1 # points to (
            # match parens
            count = 1
            curr = start + 1
            while curr < len(text) and count > 0:
                if text[curr] == '(': count += 1
                elif text[curr] == ')': count -= 1
                curr += 1
            # curr-1 is the closing paren of createPortal
            # we want to insert , document.body right before it
            text = text[:curr-1] + ', document.body' + text[curr-1:]
            idx = curr + len(', document.body')
        return text
    
    content = walk_and_replace(content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
