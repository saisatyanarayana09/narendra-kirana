import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initial formData state
if 'gallery_images: []' not in content:
    content = content.replace("image: null", "image: null, gallery_images: []")
    content = content.replace("image: product.image || null", "image: product.image || null, gallery_images: product.gallery_images || []")

# 2. Add handleGalleryUpload and handleRemoveGalleryImage
injection_functions = """
  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      gallery_images: [...prev.gallery_images, ...files]
    }));
  };

  const handleRemoveGalleryImage = async (index, imageObj) => {
    // If it's an existing image from the backend (has an ID)
    if (imageObj.id) {
      if (!window.confirm('Delete this image permanently?')) return;
      try {
        const res = await api.delete(/products//delete_gallery_image/, {
          data: { image_id: imageObj.id }
        });
        if (res.data.success) {
          toast.success('Image deleted');
        }
      } catch (err) {
        toast.error('Failed to delete image');
        return;
      }
    }
    
    // Remove from frontend state
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
"""
content = content.replace("  const handleSubmit = async (e) => {", injection_functions)

# 3. Modify handleSubmit to append gallery_images
injection_submit = """
    formData.gallery_images.forEach(file => {
      if (file instanceof File || file instanceof Blob) {
        data.append('gallery_images', file, file.name);
      }
    });

    const savePromise"""
content = content.replace("    const savePromise", injection_submit)

# 4. Add UI for gallery images right under the Product Image cropper
injection_ui = """
 </div>
 
 <div className="md:col-span-2 mt-4">
    <label className="block text-sm font-bold text-slate-700 mb-1.5">Gallery Images (Optional)</label>
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {formData.gallery_images.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                <img 
                    src={img instanceof File || img instanceof Blob ? URL.createObjectURL(img) : (img.image || img)} 
                    className="w-full h-full object-cover" 
                    alt="Gallery item"
                />
                <button type="button" onClick={() => handleRemoveGalleryImage(idx, img)} className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-4 h-4"/>
                </button>
            </div>
        ))}
        <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-500">
            <Plus className="w-6 h-6 mb-1"/>
            <span className="text-xs font-medium">Add Photos</span>
            <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
        </label>
    </div>
 </div>

<div className="flex items-center space-x-6 pt-4 md:col-span-2">"""
content = content.replace(" </div>\n<div className=\"flex items-center space-x-6 pt-4 md:col-span-2\">", injection_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
