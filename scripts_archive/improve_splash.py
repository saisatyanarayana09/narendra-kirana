import os
import re

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<div className="text-sm font-bold tracking-\[0\.2em\] uppercase text-slate-400 mb-6 drop-shadow-sm">[\s\S]*?\{greeting\}, \{name\}\.\s*</h1>', re.MULTILINE)

new_splash = """<div className="flex flex-col items-center justify-center mb-8">
     <img src="/logo.jpg" className="w-20 h-20 sm:w-24 sm:h-24 object-contain mix-blend-multiply mb-4 drop-shadow-md" alt="Logo" />
     <div className="text-sm sm:text-base font-black tracking-[0.25em] uppercase text-slate-400 drop-shadow-sm text-center ml-2">
       <span className="text-emerald-900">Narendra</span> <span className="text-primary-600">Kirana</span>
     </div>
   </div>
   <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-center px-6 leading-tight">
   {greeting},<br className="sm:hidden" /> {name}.
   </h1>"""

content = re.sub(pattern, new_splash, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
