import os

filepath = 'frontend/src/owner/pages/Invoice.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """  )}
 
 <div className={order.status === 'REJECTED' ? 'opacity-70 grayscale-[30%]' : ''}>"""

new_block = """  )}

  {/* Watermark Logo */}
  <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.04] print:opacity-[0.06] mix-blend-multiply select-none">
    <img src="/logo.jpg" alt="Watermark" className="w-[80%] max-w-lg object-contain grayscale" />
  </div>
 
 <div className={`relative z-10 ${order.status === 'REJECTED' ? 'opacity-70 grayscale-[30%]' : ''}`}>"""

content = content.replace(old_block, new_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
