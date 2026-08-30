import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

magic_function = '''  const handleMagicAI = async () => {
    if (!formData.image) {
      toast.error('Please upload an image first.');
      return;
    }
    const toastId = toast.loading('Running AI Assistant...');
    
    // We run Analyze and Enhance in parallel for maximum speed
    const analyzePromise = handleAnalyzeProduct(false); 
    const enhancePromise = handleEnhanceImage(false);
    
    await Promise.all([analyzePromise, enhancePromise]);
    
    // Description is fast enough to run sequentially after
    await handleGenerateDescription(false);
    
    toast.success('AI perfectly processed your product!', { id: toastId });
  };
'''

# We need to modify the existing handlers to accept a "showToast=true" parameter so they don't spam toasts when called by Magic.
# Wait, it's easier to just write the logic inline.

inline_magic = '''  const handleMagicAI = async () => {
    if (!formData.image) {
      toast.error('Please upload an image first.');
      return;
    }
    const toastId = toast.loading('✨ AI is extracting details, writing description, and rendering studio image...');
    try {
      const formPayload = new FormData();
      formPayload.append('image', formData.image);

      // Run Analyze and Enhance concurrently
      const [analyzeRes, enhanceRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/products/analyze_image/', { method: 'POST', body: formPayload }),
        fetch('http://127.0.0.1:8000/api/products/enhance_image/', { method: 'POST', body: formPayload })
      ]);

      let newFormData = { ...formData };

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        const extracted = analyzeData.extracted_data || {};
        newFormData = {
          ...newFormData,
          name: extracted.name || newFormData.name,
          brand: extracted.brand || newFormData.brand,
          category: extracted.category || newFormData.category,
          unit: extracted.unit || newFormData.unit,
          price: extracted.regular_price || extracted.price || newFormData.price,
          stock: extracted.stock || newFormData.stock,
          sku: extracted.sku || newFormData.sku,
          expiry_date: extracted.expiry_date || newFormData.expiry_date,
        };
      }

      if (enhanceRes.ok) {
        const blob = await enhanceRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        setEnhancedPreview({ url: blobUrl, blob: blob });
      }

      // Generate Description using the newly extracted data
      const descRes = await fetch('http://127.0.0.1:8000/api/products/generate_description/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFormData)
      });
      
      if (descRes.ok) {
        const descData = await descRes.json();
        newFormData.description = descData.description || newFormData.description;
      }

      setFormData(newFormData);
      toast.success('✨ Product instantly processed and studio rendered!', { id: toastId });

    } catch (err) {
      toast.error('AI processing failed.', { id: toastId });
    }
  };'''

# Insert after handleEnhanceImage
content = re.sub(
    r'(  const handleEnhanceImage = async \(\) => \{.*?\};\n)',
    r'\1\n' + inline_magic + '\n',
    content,
    flags=re.DOTALL
)

# Replace buttons
buttons_regex = r'<div className="flex flex-wrap gap-2\.5">.*?</div>'
replacement_buttons = '''<div className="flex flex-wrap gap-2.5">
         <button type="button" onClick={handleMagicAI} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md transform hover:-translate-y-0.5">
            <Sparkles size={18} /> 1-Click AI Auto-Fill & Studio Render
         </button>
       </div>'''

content = re.sub(buttons_regex, replacement_buttons, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated frontend")
