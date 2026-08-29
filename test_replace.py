import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_label = '<label className="block text-sm font-bold text-slate-700 mb-1.5">SKU / Barcode</label>'
new_label = '''<label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between items-center">
       <span>SKU / Barcode</span>
       <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-indigo-600 text-xs flex items-center hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
           <Camera size={14} className="mr-1" /> Scan
       </button>
   </label>'''

content = content.replace(old_label, new_label)

old_input = 'placeholder="Optional"/>\n   </div>'
new_input = '''placeholder="Optional"/>
   {showScanner && (
       <div className="mt-2 p-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
           <div id="reader" className="w-full"></div>
           <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 text-xs text-center text-red-500 font-bold py-1">Close Scanner</button>
       </div>
   )}
   </div>'''
# Need to be careful because 'placeholder="Optional"/>\n   </div>' might exist multiple times? No, just once for SKU.
# Wait, let's just do it precisely by finding the exact string.

if old_label in content:
    print("Found old label")
else:
    print("Could not find old label")

