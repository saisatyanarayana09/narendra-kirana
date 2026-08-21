import os

filepath = 'S:/smart-kirana/frontend/src/owner/components/ImageCropper.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add instruction text
hook = """            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Crop className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="leading-tight">Adjust Image</h3>
                  <p className="text-xs font-medium text-slate-500">Drag the corners to adjust</p>
                </div>
              </div>"""

old_hook = """              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Crop className="w-5 h-5 text-indigo-600" />
                  Crop Image
                </div>"""

content = content.replace(old_hook, hook)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Improved cropper UI')
