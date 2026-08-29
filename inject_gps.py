import os
import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add latitude and longitude to the address form state
content = content.replace("zip_code: '' });", "zip_code: '', latitude: null, longitude: null });")

# Add the captureLocation function
capture_fn = """   const captureLocation = () => {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => setAddressForm({...addressForm, latitude: pos.coords.latitude, longitude: pos.coords.longitude}),
         (err) => alert("Could not fetch location. Please ensure location services are enabled.")
       );
     } else {
       alert("Geolocation is not supported by your browser.");
     }
   };
"""

content = content.replace("const fetchAddresses = () => {", capture_fn + "\n   const fetchAddresses = () => {")

# Add the button to the UI
old_form = """<div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm text-slate-900">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
            <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          </div>"""

new_form = """<div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm text-slate-900">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
            <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
          <button type="button" onClick={captureLocation} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition-all border border-slate-200">
            <MapPin size={14} className={addressForm.latitude ? "text-green-600" : "text-slate-500"} />
            {addressForm.latitude ? "📍 Location Captured" : "📍 Capture My Exact Location"}
          </button>"""

content = content.replace(old_form, new_form)

# Make sure submit sends the lat/lng from the selected address
old_submit = """      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_pincode: deliveryPincode
    });"""

new_submit = """      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_pincode: deliveryPincode,
      delivery_latitude: selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.latitude : null,
      delivery_longitude: selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.longitude : null
    });"""

content = content.replace(old_submit, new_submit)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
