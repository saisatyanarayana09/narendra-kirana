import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace enhancedPreview state
content = content.replace("const [enhancedPreview, setEnhancedPreview] = useState(null);", "")
content = content.replace("setEnhancedPreview(null);", "")
content = content.replace("image: null", "image: null, imageBack: null")

# Remove handleEnhanceImage
content = re.sub(r'  const handleEnhanceImage = async \(\) => \{.*?\};\n', '', content, flags=re.DOTALL)

# Update handleMagicAI
old_magic = '''  const handleMagicAI = async () => {
    if (!formData.image || !(formData.image instanceof File || formData.image instanceof Blob)) {
      toast.error('Please upload a new image first.');
      return;
    }
    const toastId = toast.loading('✨ AI is processing product...');
    try {
      const formPayload = new FormData();
      formPayload.append('image', formData.image);

      const [analyzeRes, enhanceRes] = await Promise.allSettled([
        api.post('/products/analyze_image/', formPayload),
        api.post('/products/enhance_image/', formPayload, { responseType: 'blob' })
      ]);

      let newFormData = { ...formData };

      if (analyzeRes.status === 'fulfilled' && analyzeRes.value.data.success) {
        const extracted = analyzeRes.value.data.extracted_data || {};
        newFormData = {
          ...newFormData,
          name: extracted.name || newFormData.name,
          brand: extracted.brand || newFormData.brand,
          category: extracted.category || newFormData.category,
          unit: extracted.unit || newFormData.unit,
          regular_price: extracted.regular_price || extracted.price || newFormData.regular_price,
          stock_quantity: extracted.stock || newFormData.stock_quantity,
          sku: extracted.sku || newFormData.sku,
          expiry_date: extracted.expiry_date || newFormData.expiry_date,
        };
      }

      if (enhanceRes.status === 'fulfilled' && enhanceRes.value.status === 200) {
        const blob = enhanceRes.value.data;
        const blobUrl = URL.createObjectURL(blob);
        setEnhancedPreview({ url: blobUrl, blob: blob });
      }

      try {
          const descRes = await api.post('/products/generate_description/', newFormData);
          if (descRes.data.success) {
            newFormData.description = descRes.data.description || newFormData.description;
          }
      } catch (descErr) {
          console.warn("Description generation failed", descErr);
      }

      setFormData(newFormData);
      toast.success('✨ Product instantly processed and studio rendered!', { id: toastId });

    } catch (err) {
      toast.error('AI processing failed.', { id: toastId });
    }
  };'''

new_magic = '''  const handleMagicAI = async () => {
    if (!formData.image && !formData.imageBack) {
      toast.error('Please upload at least one image first.');
      return;
    }
    const toastId = toast.loading('✨ AI is highly analyzing front & back details...');
    try {
      const formPayload = new FormData();
      if (formData.image instanceof File || formData.image instanceof Blob) {
          formPayload.append('imageFront', formData.image);
      }
      if (formData.imageBack instanceof File || formData.imageBack instanceof Blob) {
          formPayload.append('imageBack', formData.imageBack);
      }

      const analyzeRes = await api.post('/products/analyze_image/', formPayload);

      let newFormData = { ...formData };

      if (analyzeRes.data.success) {
        const extracted = analyzeRes.data.extracted_data || {};
        newFormData = {
          ...newFormData,
          name: extracted.name || newFormData.name,
          brand: extracted.brand || newFormData.brand,
          category: extracted.category || newFormData.category,
          unit: extracted.unit || newFormData.unit,
          regular_price: extracted.regular_price || extracted.price || newFormData.regular_price,
          stock_quantity: extracted.stock || newFormData.stock_quantity,
          sku: extracted.sku || newFormData.sku,
          expiry_date: extracted.expiry_date || newFormData.expiry_date,
        };
      }

      try {
          const descRes = await api.post('/products/generate_description/', newFormData);
          if (descRes.data.success) {
            newFormData.description = descRes.data.description || newFormData.description;
          }
      } catch (descErr) {
          console.warn("Description generation failed", descErr);
      }

      setFormData(newFormData);
      toast.success('✨ Product details extracted accurately!', { id: toastId });

    } catch (err) {
      toast.error('AI processing failed.', { id: toastId });
    }
  };'''

content = content.replace(old_magic, new_magic)

# Remove enhanced preview rendering
preview_regex = re.compile(r'      \{enhancedPreview && \(.*?\)\}', re.DOTALL)
content = preview_regex.sub('', content)

# Change Image Upload block
old_upload = '''     <div className="md:col-span-2">
      <label className="block text-sm font-bold text-slate-700 mb-3">Product Image</label>
      <div className="flex items-start space-x-6">
         <div className="relative group flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group-hover:border-indigo-400 group-hover:bg-indigo-50/50 transition-all">
               {formData.image ? (
                  <img src={formData.image instanceof File ? URL.createObjectURL(formData.image) : formData.image} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                  <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                     <ImageIcon size={32} className="mb-2" />
                     <span className="text-xs font-bold">Upload</span>
                  </div>
               )}
            </div>
            <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
         </div>
         <div className="flex-1 pt-2">
            <p className="text-sm font-bold text-slate-700 mb-1">
               AI Product Analysis & Enhancement
            </p>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-md">
               Upload a product photo above, then use AI to instantly fill out the details, write a description, and enhance the image quality.
            </p>
            <div className="flex flex-wrap gap-2.5">
               <button type="button" onClick={handleMagicAI} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md transform hover:-translate-y-0.5">
                  <Sparkles size={18} /> 1-Click AI Auto-Fill & Studio Render
               </button>
             </div>'''

new_upload = '''     <div className="md:col-span-2">
      <label className="block text-sm font-bold text-slate-700 mb-3">Product Images (Front & Back for highest AI accuracy)</label>
      <div className="flex flex-col md:flex-row items-start gap-6">
         <div className="flex gap-4">
             <div className="relative group flex-shrink-0">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group-hover:border-indigo-400 group-hover:bg-indigo-50/50 transition-all">
                   {formData.image ? (
                      <img src={formData.image instanceof File || formData.image instanceof Blob ? URL.createObjectURL(formData.image) : formData.image} alt="Front" className="w-full h-full object-cover" />
                   ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                         <ImageIcon size={28} className="mb-2" />
                         <span className="text-xs font-bold">Front</span>
                      </div>
                   )}
                </div>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) setFormData({...formData, image: e.target.files[0]}) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             </div>
             
             <div className="relative group flex-shrink-0">
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden group-hover:border-indigo-400 group-hover:bg-indigo-50/50 transition-all">
                   {formData.imageBack ? (
                      <img src={formData.imageBack instanceof File || formData.imageBack instanceof Blob ? URL.createObjectURL(formData.imageBack) : formData.imageBack} alt="Back" className="w-full h-full object-cover" />
                   ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                         <ImageIcon size={28} className="mb-2" />
                         <span className="text-xs font-bold">Back</span>
                      </div>
                   )}
                </div>
                <input type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) setFormData({...formData, imageBack: e.target.files[0]}) }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             </div>
         </div>
         <div className="flex-1 pt-2">
            <p className="text-sm font-bold text-slate-700 mb-1">
               AI Product Analysis
            </p>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed max-w-md">
               Upload front and back photos, then use AI to instantly read all text, extract the barcode, and generate a clean description.
            </p>
            <div className="flex flex-wrap gap-2.5">
               <button type="button" onClick={handleMagicAI} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md transform hover:-translate-y-0.5">
                  <Sparkles size={18} /> ✨ Auto-Fill Details from Images
               </button>
             </div>'''

content = content.replace(old_upload, new_upload)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated frontend")
