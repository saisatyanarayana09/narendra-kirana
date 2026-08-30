import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_enhance = '''  const handleEnhanceImage = async () => {'''

good_enhance = '''  const handleGenerateImage = async () => {
    if (!formData.name) {
      toast.error('Please analyze or enter product details first.');
      return;
    }
    const toastId = toast.loading('Generating AI product image...');
    try {
      const prompt = Professional e-commerce product photography of \ \ \, highly detailed, pure white background, studio lighting, photorealistic, 4k;
      const encodedPrompt = encodeURIComponent(prompt);
      const url = https://image.pollinations.ai/prompt/\?width=1024&height=1024&nologo=true;
      
      const response = await fetch(url);
      const blob = await response.blob();
      
      if (blob) {
        toast.success('Product image generated!', { id: toastId });
        const blobUrl = URL.createObjectURL(blob);
        setEnhancedPreview({ url: blobUrl, blob: blob });
      } else {
        toast.error('Failed to generate image.', { id: toastId });
      }
    } catch (err) {
      toast.error('Generation request failed.', { id: toastId });
    }
  };

  const handleEnhanceImage = async () => {'''

if bad_enhance in content:
    content = content.replace(bad_enhance, good_enhance)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added handleGenerateImage")
else:
    print("Not found enhance method")
