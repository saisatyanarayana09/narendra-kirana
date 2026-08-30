import os

filepath = 'frontend/src/owner/pages/Invoice.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_billed_to = """  <div>
  <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1 inline-block">Billed To</h3>
  <p className="text-lg font-bold text-slate-900 mt-2">{order.customer_name || `Customer ID: ${order.customer}`}</p>
  <p className="text-slate-600 mt-1">Order Status: <span className={`font-semibold ${order.status === 'REJECTED' ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{order.status}</span></p>
  </div>"""

new_billed_to = """  <div>
  <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1 inline-block">Billed To</h3>
  <p className="text-lg font-bold text-slate-900 mt-2">{order.customer_name || `Customer ID: ${order.customer}`}</p>
  <p className="text-slate-600 mt-1">Order Status: <span className={`font-semibold ${order.status === 'REJECTED' ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{order.status}</span></p>
  
  <div className="mt-4 pt-3 border-t border-slate-100 print:border-slate-200">
    <p className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-1">
      Order Type: <span className={order.order_type === 'DELIVERY' ? 'text-indigo-600 print:text-black' : 'text-slate-800'}>{order.order_type === 'DELIVERY' ? 'HOME DELIVERY' : 'STORE PICKUP'}</span>
    </p>
    {order.order_type === 'DELIVERY' ? (
      <div className="text-slate-600 mt-1">
        <p className="font-medium whitespace-pre-wrap">{order.delivery_address}</p>
        {order.delivery_pincode && <p>Pincode: {order.delivery_pincode}</p>}
      </div>
    ) : (
      <p className="text-slate-600 mt-1 font-medium">Pickup Time: {order.pickup_time || 'As soon as possible'}</p>
    )}
  </div>
  </div>"""

content = content.replace(old_billed_to, new_billed_to)

old_packaging = """  {parseFloat(order.packaging_fee) > 0 && (
  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Packaging Fee</span>
  <span className="font-semibold text-slate-900">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
  </div>
  )}"""

new_packaging = """  {parseFloat(order.packaging_fee) > 0 && (
  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Packaging Fee</span>
  <span className="font-semibold text-slate-900">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
  </div>
  )}

  {order.order_type === 'DELIVERY' && (
  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Delivery Fee</span>
  <span className="font-semibold text-slate-900">{parseFloat(order.delivery_fee) > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}</span>
  </div>
  )}"""

content = content.replace(old_packaging, new_packaging)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
