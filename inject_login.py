import os

filepath = 'frontend/src/owner/pages/Login.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_login = """<p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-1">
  <span className="text-emerald-900">NARENDRA</span> <span className="text-primary-600">KIRANA</span>
  </p>"""
new_login = """<div className="flex items-center justify-center mb-4"><img src="/logo.jpg" alt="Logo" className="w-16 h-16 rounded-xl shadow-sm mix-blend-multiply" /></div>
  <p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-1">
  <span className="text-emerald-900">NARENDRA</span> <span className="text-primary-600">KIRANA</span>
  </p>"""
content = content.replace(old_login, new_login)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
