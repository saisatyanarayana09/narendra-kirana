import os
import re

filepath = 'frontend/src/profile/pages/SavedAddresses.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = """             <button type="button" onClick={captureLocation} className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 transition-all border border-slate-200">
                <MapPin size={14} className={form.latitude ? "text-green-600" : "text-slate-500"} />
                {form.latitude ? "📍 Location Captured" : "📍 Capture My Exact Location"}
              </button>"""

new_btn = """             <button type="button" onClick={captureLocation} className={`w-full sm:w-auto font-extrabold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] ${form.latitude ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                <MapPin size={18} className={form.latitude ? "text-emerald-600" : "text-indigo-600"} />
                {form.latitude ? "✅ Location Saved (Tap to Relocate)" : "📍 Capture My Exact Location"}
              </button>"""

content = content.replace(old_btn, new_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
