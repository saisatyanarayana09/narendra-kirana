import re

files = {
    'S:/smart-kirana/frontend/src/owner/components/HomepageSectionEditor.jsx': ('{pickerOpen && (', '{pickerOpen && createPortal('),
    'S:/smart-kirana/frontend/src/owner/components/ImageCropper.jsx': ('{isCropping && (', '{isCropping && createPortal('),
    'S:/smart-kirana/frontend/src/owner/components/QRScanner.jsx': ('{isScanning && (', '{isScanning && createPortal('),
    'S:/smart-kirana/frontend/src/owner/pages/Customers.jsx': ('{isViewOpen && selectedCustomer && (', '{isViewOpen && selectedCustomer && createPortal('),
    'S:/smart-kirana/frontend/src/owner/pages/Products.jsx': ('{isFormOpen && (', '{isFormOpen && createPortal('),
    'S:/smart-kirana/frontend/src/owner/pages/Showcase.jsx': ('{isAddSectionOpen && (', '{isAddSectionOpen && createPortal(')
}

# We also need to handle Offers.jsx and Referrals.jsx manually because they might have multiple.
