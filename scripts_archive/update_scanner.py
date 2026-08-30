import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Html5QrcodeScanner import
if 'Html5QrcodeScanner' not in content:
    content = content.replace("import { Plus, Edit2, Trash2", "import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';\nimport { Plus, Edit2, Trash2")

# Add showScanner state
if 'showScanner' not in content:
    content = content.replace("const [isFormOpen, setIsFormOpen] = useState(false);", "const [isFormOpen, setIsFormOpen] = useState(false);\n   const [showScanner, setShowScanner] = useState(false);")

# Add useEffect for scanner
scanner_effect = '''
  useEffect(() => {
    if (showScanner) {
      let scanner = null;
      try {
          scanner = new Html5QrcodeScanner('reader', {
            qrbox: { width: 250, height: 100 },
            fps: 10,
            formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE ]
          }, false);
          
          scanner.render(
            (decodedText) => {
              setFormData(prev => ({...prev, sku: decodedText}));
              toast.success('Barcode scanned successfully!');
              setShowScanner(false);
              scanner.clear().catch(e => console.log(e));
            },
            (error) => {}
          );
      } catch(err) {
          console.warn('Scanner init error', err);
      }
      
      return () => {
        if (scanner) {
            scanner.clear().catch(e => console.log('Failed to clear scanner', e));
        }
      };
    }
  }, [showScanner]);
'''

if 'Html5QrcodeScanner(\'reader\'' not in content:
    content = content.replace("useEffect(() => {\n      fetchData();", scanner_effect + "\n   useEffect(() => {\n      fetchData();")

# Modify SKU field in the form to include a Scan button
old_sku = '''   <div>
   <label className="block text-sm font-bold text-slate-700 mb-1.5">SKU / Barcode</label>
   <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional"/>
   </div>'''

new_sku = '''   <div>
   <label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between items-center">
       <span>SKU / Barcode</span>
       <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-indigo-600 text-xs flex items-center hover:text-indigo-800">
           <Camera size={14} className="mr-1" /> Scan
       </button>
   </label>
   <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional"/>
   {showScanner && (
       <div className="mt-2 p-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
           <div id="reader" className="w-full"></div>
           <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 text-xs text-center text-red-500 font-bold py-1">Cancel Scanner</button>
       </div>
   )}
   </div>'''

content = content.replace(old_sku, new_sku)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added barcode scanner")
