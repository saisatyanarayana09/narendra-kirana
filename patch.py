import sys

filepath = 'S:/smart-kirana/frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    \"import { Plus, Edit2, Trash2, X, Image as ImageIcon, Package, GripVertical, ScanLine, Camera } from 'lucide-react';\",
    \"import { Plus, Edit2, Trash2, X, Image as ImageIcon, Package, GripVertical, ScanLine, Camera, Sparkles, Wand2, FileText } from 'lucide-react';\"
)

content = content.replace(
    'const [isScanning, setIsScanning] = useState(false);',
    'const [isScanning, setIsScanning] = useState(false);\n const [enhancedPreview, setEnhancedPreview] = useState(null);'
)

handlers = \"\"\"
 const handleAnalyzeProduct = async () => {
   if (!formData.image || !(formData.image instanceof File || formData.image instanceof Blob)) {
     toast.error('Please upload a new image first.');
     return;
   }
   const toastId = toast.loading('Analyzing product...');
   try {
     const uploadData = new FormData();
     uploadData.append('image', formData.image);
     const res = await api.post('/products/analyze_image/', uploadData);
     if (res.data.success) {
       toast.success('Product details extracted!', { id: toastId });
       setFormData(prev => ({
         ...prev,
         name: res.data.data.name || prev.name,
         brand: res.data.data.brand || prev.brand,
         unit: res.data.data.unit || prev.unit
       }));
       if (res.data.data.category) {
         const matchedCat = categories.find(c => c.name.toLowerCase().includes(res.data.data.category.toLowerCase()) || res.data.data.category.toLowerCase().includes(c.name.toLowerCase()));
         if (matchedCat) {
           setFormData(prev => ({...prev, category: matchedCat.id}));
         } else {
           toast('Suggested Category: ' + res.data.data.category + ' (No exact match)', { icon: 'ℹ️', duration: 4000 });
         }
       }
     } else {
       toast.error(res.data.error || 'Failed to analyze.', { id: toastId });
     }
   } catch (err) {
     toast.error('Analysis request failed.', { id: toastId });
   }
 };

 const handleGenerateDescription = async () => {
   const toastId = toast.loading('Generating description...');
   try {
     const res = await api.post('/products/generate_description/', {
       name: formData.name, brand: formData.brand, unit: formData.unit, 
       category: categories.find(c => String(c.id) === String(formData.category))?.name || ''
     });
     if (res.data.success) {
       toast.success('Description generated!', { id: toastId });
       setFormData(prev => ({ ...prev, description: res.data.description }));
     } else {
       toast.error(res.data.error || 'Failed to generate.', { id: toastId });
     }
   } catch (err) {
     toast.error('Generation request failed.', { id: toastId });
   }
 };

 const handleEnhanceImage = async () => {
   if (!formData.image || !(formData.image instanceof File || formData.image instanceof Blob)) {
     toast.error('Please upload a new image first.');
     return;
   }
   const toastId = toast.loading('Enhancing image (this may take a moment)...');
   try {
     const uploadData = new FormData();
     uploadData.append('image', formData.image);
     const res = await api.post('/products/enhance_image/', uploadData, { responseType: 'blob' });
     
     if (res.status === 200 && res.data.type.startsWith('image/')) {
       toast.success('Image enhanced successfully!', { id: toastId });
       const blobUrl = URL.createObjectURL(res.data);
       setEnhancedPreview({ url: blobUrl, blob: res.data });
     } else {
       toast.error('Failed to enhance image.', { id: toastId });
     }
   } catch (err) {
     toast.error('Enhancement request failed.', { id: toastId });
   }
 };
\"\"\"

content = content.replace(
    'const closeForm = () => { setIsFormOpen(false); setEditingId(null); };',
    'const closeForm = () => { setIsFormOpen(false); setEditingId(null); setEnhancedPreview(null); };\\n' + handlers
)

ai_panel = \"\"\"
 </div>
   {/* Smart AI Creation Panel */}
   <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 mt-2">
     <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-indigo-600" size={20} />
        <h3 className="font-extrabold text-indigo-900 text-sm sm:text-base">AI Product Assistant</h3>
     </div>
     <p className="text-xs sm:text-sm text-indigo-700/80 font-medium mb-4">
        Upload a product photo above, then use AI to instantly fill out the details, write a description, and enhance the image quality.
     </p>
     <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={handleAnalyzeProduct} className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
           <ScanLine size={16} /> Analyze Details
        </button>
        <button type="button" onClick={handleGenerateDescription} className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
           <FileText size={16} /> Write Description
        </button>
        <button type="button" onClick={handleEnhanceImage} className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
           <Wand2 size={16} /> Enhance Photo
        </button>
     </div>
     
     {enhancedPreview && (
       <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex gap-4 flex-1 justify-center sm:justify-start">
             <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Original</p>
                <img src={URL.createObjectURL(formData.image)} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm border border-slate-100" />
             </div>
             <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1.5">✨ Enhanced</p>
                <img src={enhancedPreview.url} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm border-2 border-emerald-400" />
             </div>
          </div>
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
             <button type="button" onClick={() => {
                 const file = new File([enhancedPreview.blob], 'enhanced.jpg', { type: 'image/jpeg' });
                 setFormData({...formData, image: file});
                 setEnhancedPreview(null);
                 toast.success('Enhanced image applied!');
             }} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm">Use Enhanced</button>
             <button type="button" onClick={() => setEnhancedPreview(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition">Keep Original</button>
          </div>
       </div>
     )}
   </div>
   <div className="flex items-center space-x-6 pt-4 md:col-span-2">
\"\"\"

content = content.replace(
    '</div>\\n <div className=\"flex items-center space-x-6 pt-2\">',
    ai_panel
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Patch applied successfully')
