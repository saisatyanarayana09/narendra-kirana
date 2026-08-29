import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

inline_magic = '''
  const handleMagicAI = async () => {
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
  };
'''

content = content.replace(" const closeForm = () => {", inline_magic + "\n const closeForm = () => {", 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected handleMagicAI safely")
