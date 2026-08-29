import os

filepath = 'frontend/src/owner/layouts/OwnerLayout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the text logo in the sidebar
old_sidebar = """<Link to="/owner" className="text-xl font-black tracking-tighter whitespace-nowrap leading-tight">
               <span className="text-white">Narendra</span>
               <span className="text-primary-500 ml-1">Kirana</span>
             </Link>"""
new_sidebar = """<Link to="/owner" className="flex items-center gap-3 text-xl font-black tracking-tighter whitespace-nowrap leading-tight">
               <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-md" />
               <div className="flex flex-col"><span className="text-white">Narendra <span className="text-primary-500">Kirana</span></span></div>
             </Link>"""
content = content.replace(old_sidebar, new_sidebar)

# Replace the text logo in the mobile navbar
old_mob_nav = """<span className="text-xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm">
             <span className="text-emerald-900">Narendra</span>
             <span className="text-primary-600 ml-1">Kirana</span>
           </span>"""
new_mob_nav = """<span className="flex items-center gap-2 text-xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm">
             <img src="/logo.jpg" alt="Logo" className="w-7 h-7 rounded-md mix-blend-multiply" />
             <span><span className="text-emerald-900">Narendra</span><span className="text-primary-600 ml-1">Kirana</span></span>
           </span>"""
content = content.replace(old_mob_nav, new_mob_nav)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
