import os
import re

filepath = 'frontend/src/profile/pages/SavedAddresses.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure RefreshCw and CheckCircle2 are imported
if "RefreshCw" not in content:
    content = content.replace("Edit2 } from 'lucide-react'", "Edit2, RefreshCw, CheckCircle2 } from 'lucide-react'")

old_fn = """  const captureLocation = () => {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => setForm({...form, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))}),
         (err) => alert("Could not fetch location. Please ensure location services are enabled.")
       );
     } else {
       alert("Geolocation is not supported by your browser.");
     }
   };"""

new_fn = """  const captureLocation = () => {
     const loadingToast = toast.loading("Getting your exact location...");
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => {
             setForm({...form, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))});
             toast.success("Location captured successfully!", { id: loadingToast });
         },
         (err) => {
             toast.error("Could not fetch location. Please enable GPS.", { id: loadingToast });
         }
       );
     } else {
       toast.error("Geolocation not supported.", { id: loadingToast });
     }
   };"""
content = content.replace(old_fn, new_fn)

old_btn = """             <button type="button" onClick={captureLocation} className={`w-full sm:w-auto font-extrabold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] ${form.latitude ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                <MapPin size={18} className={form.latitude ? "text-emerald-600" : "text-indigo-600"} />
                {form.latitude ? "✅ Location Saved (Tap to Relocate)" : "📍 Capture My Exact Location"}
              </button>"""

new_btn = """             {!form.latitude ? (
                <button type="button" onClick={captureLocation} className="w-full sm:w-auto font-extrabold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
                  <MapPin size={18} className="text-indigo-600" />
                  📍 Capture My Exact Location
                </button>
              ) : (
                <div className="w-full sm:w-auto flex items-center justify-between gap-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl p-2.5 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm pl-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>GPS Secured</span>
                  </div>
                  <button type="button" onClick={captureLocation} className="flex items-center gap-1.5 text-xs font-bold bg-white text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm active:scale-95">
                    <RefreshCw size={14} /> Relocate
                  </button>
                </div>
              )}"""
content = content.replace(old_btn, new_btn)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
