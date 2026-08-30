import os
import re

filepath = 'frontend/src/owner/pages/Invoice.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_thead = """ <tr className="bg-slate-100 border-y border-slate-300 print:bg-slate-50 print:border-y-2 print:border-slate-800">
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider w-1/2">Item Description</th>"""

new_thead = """ <tr className="bg-slate-100 border-y border-slate-300 print:bg-slate-50 print:border-y-2 print:border-slate-800">
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider text-center w-12">#</th>
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider">Item Description</th>"""

content = content.replace(old_thead, new_thead)


old_tbody = """ <tr key={index} className="print:break-inside-avoid">
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">"""

new_tbody = """ <tr key={index} className="print:break-inside-avoid">
 <td className={`py-4 px-4 text-center font-bold ${isRejected ? 'text-slate-300' : 'text-slate-400'}`}>
 {index + 1}
 </td>
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">"""

content = content.replace(old_tbody, new_tbody)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
