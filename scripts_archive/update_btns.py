import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleMagicAI with handleAnalyzeProduct and handleGenerateDescription
old_magic = '''  const handleMagicAI = async () => {
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

new_functions = '''  const handleAnalyzeProduct = async () => {
    if (!formData.image && !formData.imageBack) {
      toast.error('Please upload at least one image first.');
      return;
    }
    const toastId = toast.loading('✨ AI is analyzing image details...');
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
        setFormData(newFormData);
        toast.success('✨ Product details extracted accurately!', { id: toastId });
      } else {
        toast.error('AI extraction failed.', { id: toastId });
      }
    } catch (err) {
      toast.error('AI processing failed.', { id: toastId });
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name && !formData.category) {
        toast.error('Please fill in Name and Category first.');
        return;
    }
    const toastId = toast.loading('✨ Generating description...');
    try {
        const descRes = await api.post('/products/generate_description/', formData);
        if (descRes.data.success) {
            setFormData(prev => ({ ...prev, description: descRes.data.description }));
            toast.success('Description generated!', { id: toastId });
        } else {
            toast.error('Failed to generate description.', { id: toastId });
        }
    } catch (err) {
        toast.error('Description generation failed.', { id: toastId });
    }
  };'''

content = content.replace(old_magic, new_functions)

# Wait, what if old_magic isn't exactly matched? 
# Let's write a regex for handleMagicAI.
pattern = re.compile(r'\s*const handleMagicAI = async \(\) => \{[\s\S]*?(?=\s*const closeForm = \(\) => \{)', re.DOTALL)
if pattern.search(content):
    content = pattern.sub('\n' + new_functions + '\n', content)
    print("Replaced handleMagicAI")
else:
    print("Could not find handleMagicAI via regex")


# Replace the UI buttons
old_btn_ui = '''       <div className="flex flex-wrap gap-2.5">
         <button type="button" onClick={handleMagicAI} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md transform hover:-translate-y-0.5">
            <Sparkles size={18} /> 1-Click AI Auto-Fill & Studio Render
         </button>
       </div>'''

new_btn_ui = '''       <div className="flex flex-wrap gap-2.5">
         <button type="button" onClick={handleAnalyzeProduct} className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
            <ScanLine size={16} /> Auto-Fill Details by Image
         </button>
         <button type="button" onClick={handleGenerateDescription} className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
            <FileText size={16} /> Create Product Description
         </button>
       </div>'''

if old_btn_ui in content:
    content = content.replace(old_btn_ui, new_btn_ui)
    print("Replaced buttons via string match")
else:
    # Use regex to find the button container
    btn_pattern = re.compile(r'\s*<div className="flex flex-wrap gap-2\.5">[\s\S]*?</button>\s*</div>', re.DOTALL)
    if btn_pattern.search(content):
        content = btn_pattern.sub('\n' + new_btn_ui + '\n', content)
        print("Replaced buttons via regex")
    else:
        print("Could not find button UI")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
