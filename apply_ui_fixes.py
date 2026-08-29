import os
import re

# --- FIX 1: ADDRESS BOOK OVERFLOW IN CART.JSX ---
cart_path = 'frontend/src/cart.jsx'
with open(cart_path, 'r', encoding='utf-8') as f:
    cart_content = f.read()

# Find the div wrapping the addresses map
old_address_list = """      ) : (
        <div className="space-y-3">
            {addresses.length === 0 ? ("""

new_address_list = """      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {addresses.length === 0 ? ("""

if old_address_list in cart_content:
    cart_content = cart_content.replace(old_address_list, new_address_list)
    with open(cart_path, 'w', encoding='utf-8') as f:
        f.write(cart_content)
    print("Fixed Cart Address Overflow.")

# --- FIX 2: PRINT CSS IN ORDER DETAILS ---
order_path = 'frontend/src/owner/pages/OrderDetails.jsx'
with open(order_path, 'r', encoding='utf-8') as f:
    order_content = f.read()

# Hide the action buttons during print
old_action_card = """   {/* Action Card */}
   {['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
   <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">"""

new_action_card = """   {/* Action Card */}
   {['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
   <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 print:hidden">"""

if old_action_card in order_content:
    order_content = order_content.replace(old_action_card, new_action_card)
    
old_header = """   <div className="flex items-center justify-between mb-8">
   <div className="flex items-center space-x-4">
   <Link 
   to="/owner/orders" 
   className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors 
shadow-sm"
   >"""

new_header = """   <div className="flex items-center justify-between mb-8 print:hidden">
   <div className="flex items-center space-x-4">
   <Link 
   to="/owner/orders" 
   className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors 
shadow-sm"
   >"""

if old_header in order_content:
    order_content = order_content.replace(old_header, new_header)

with open(order_path, 'w', encoding='utf-8') as f:
    f.write(order_content)
print("Fixed OrderDetails Print CSS.")

# --- FIX 3: IMAGE SIZE VALIDATION IN PRODUCTS.JSX ---
prod_path = 'frontend/src/owner/pages/Products.jsx'
with open(prod_path, 'r', encoding='utf-8') as f:
    prod_content = f.read()

# We need to find the image input onChange
old_img_input = """                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}"""

new_img_input = """                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Image is too large. Please select an image under 2MB.");
                        e.target.value = '';
                        return;
                      }
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}"""

if old_img_input in prod_content:
    prod_content = prod_content.replace(old_img_input, new_img_input)
    with open(prod_path, 'w', encoding='utf-8') as f:
        f.write(prod_content)
    print("Fixed Product Image Size Validation.")

