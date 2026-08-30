import os

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_fn = """   const handleGalleryUpload = (e) => {
       const files = Array.from(e.target.files);
       setFormData(prev => ({
         ...prev,
         gallery_images: [...prev.gallery_images, ...files]
       }));
     };"""

new_fn = """   const handleGalleryUpload = (e) => {
       const files = Array.from(e.target.files);
       const validFiles = [];
       for (const file of files) {
           if (file.size > 2 * 1024 * 1024) {
               toast.error(`Image ${file.name} is too large (Max 2MB).`);
           } else {
               validFiles.push(file);
           }
       }
       setFormData(prev => ({
         ...prev,
         gallery_images: [...prev.gallery_images, ...validFiles]
       }));
       e.target.value = '';
     };"""

content = content.replace(old_fn, new_fn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
