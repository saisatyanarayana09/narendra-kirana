import os

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the text logo in the welcome splash screen
old_splash = """<span className="text-slate-700">Narendra</span> <span className="text-primary-600">Kirana</span>"""
new_splash = """<div className="flex items-center justify-center gap-3"><img src="/logo.jpg" className="w-12 h-12 object-contain mix-blend-multiply" alt="Logo" /><span className="text-slate-700">Narendra</span> <span className="text-primary-600">Kirana</span></div>"""
content = content.replace(old_splash, new_splash)

# Replace the text logo in the navbar
old_nav = """<Link to="/"className="text-2xl sm:text-3xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity">
   <span className="text-slate-800">Narendra</span>
   <span className="text-primary-600">Kirana</span>
   </Link>"""
new_nav = """<Link to="/"className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity">
   <img src="/logo.jpg" className="w-8 h-8 sm:w-10 sm:h-10 object-contain mix-blend-multiply" alt="Logo" />
   <div><span className="text-slate-800">Narendra</span><span className="text-primary-600">Kirana</span></div>
   </Link>"""
content = content.replace(old_nav, new_nav)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
