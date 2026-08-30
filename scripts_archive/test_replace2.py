import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'   <div>\s*<label[^>]*>SKU / Barcode</label>\s*<input[^>]*value=\{formData\.sku\}[^>]*/>\s*</div>', re.DOTALL)

new_sku = '''   <div>
   <label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between items-center">
       <span>SKU / Barcode</span>
       <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-indigo-600 text-xs flex items-center hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
           <Camera size={14} className="mr-1" /> Scan
       </button>
   </label>
   <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional"/>
   {showScanner && (
       <div className="mt-2 p-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
           <div id="reader" className="w-full"></div>
           <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 text-xs text-center text-red-500 font-bold py-1">Close Scanner</button>
       </div>
   )}
   </div>'''

if pattern.search(content):
    content = pattern.sub(new_sku, content, count=1)
    print("Replaced SKU field")
else:
    print("Still failed to find SKU field")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
