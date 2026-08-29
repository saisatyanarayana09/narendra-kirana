import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

injection_submit = """
    if (formData.gallery_images) {
      formData.gallery_images.forEach(file => {
        if (file instanceof File || file instanceof Blob) {
          data.append('gallery_images', file, file.name);
        }
      });
    }
"""

content = re.sub(r'([ \t]*)const savePromise = editingId', r'\1' + injection_submit.replace('\n', '\n\\1') + 'const savePromise = editingId', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
