import os
import re

filepath = 'frontend/src/owner/pages/OrderDetails.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_delivery = """   <p className="font-bold text-indigo-900 whitespace-pre-line text-sm">{order.delivery_address}</p>
   {order.delivery_pincode && <p className="text-xs text-indigo-700 mt-1 font-semibold">Pincode: {order.delivery_pincode}</p>}
   </div>
   )}"""

new_delivery = """   <p className="font-bold text-indigo-900 whitespace-pre-line text-sm">{order.delivery_address}</p>
   {order.delivery_pincode && <p className="text-xs text-indigo-700 mt-1 font-semibold">Pincode: {order.delivery_pincode}</p>}
   {order.delivery_latitude && order.delivery_longitude && (
     <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-sm">
       <MapPin size={14} /> Start Live Navigation
     </a>
   )}
   </div>
   )}"""

if "MapPin" not in content:
    content = content.replace("from 'lucide-react'", ", MapPin } from 'lucide-react'")

content = content.replace(old_delivery, new_delivery)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
