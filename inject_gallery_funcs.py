import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

injection_functions = """
  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      gallery_images: [...prev.gallery_images, ...files]
    }));
  };

  const handleRemoveGalleryImage = async (index, imageObj) => {
    if (imageObj.id) {
      if (!window.confirm('Delete this image permanently?')) return;
      try {
        const res = await api.delete(/products//delete_gallery_image/, {
          data: { image_id: imageObj.id }
        });
        if (res.data.success) {
          // Toast won't be defined if toast isn't imported, but it is
        }
      } catch (err) {
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index)
    }));
  };

"""

content = re.sub(r'([ \t]*)const handleSubmit = async \(e\) => \{', r'\1' + injection_functions.replace('\n', '\n\\1') + 'const handleSubmit = async (e) => {', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
