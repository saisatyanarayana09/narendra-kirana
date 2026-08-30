import os
import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"useEffect\(\(\) => \{\s*if \(isCustomer\) \{\s*api\.get\('/auth/wallet/'\)\.then\(res => setWalletBalance\(parseFloat\(res\.data\.balance\)\)\)\.catch\(console\.error\);\s*\}\s*\}, \[isCustomer\]\);"

new_useeffect = """useEffect(() => {
     if (isCustomer) {
       api.get('/auth/wallet/').then(res => setWalletBalance(parseFloat(res.data.balance))).catch(console.error);
       
       // Auto-fill delivery address from customer's saved addresses
       api.get('/auth/addresses/').then(res => {
         const addresses = res.data.results || res.data;
         if (addresses && addresses.length > 0) {
           const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
           const formatted = [defaultAddr.street, defaultAddr.landmark, defaultAddr.city, defaultAddr.state].filter(Boolean).join(', ');
           setDeliveryAddress(prev => prev || formatted); // only overwrite if currently empty
           setDeliveryPincode(prev => prev || defaultAddr.zip_code || ''); // only overwrite if currently empty
         }
       }).catch(console.error);
     }
   }, [isCustomer]);"""

if re.search(pattern, content):
    content = re.sub(pattern, new_useeffect, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Could not find pattern.")
