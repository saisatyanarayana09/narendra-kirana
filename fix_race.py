import os
import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_save = """       if (editingAddressId) {
         await api.put(`/auth/addresses/${editingAddressId}/`, addressForm);
       } else {
         const res = await api.post('/auth/addresses/', addressForm);
         setSelectedAddressId(res.data.id);
       }
       setShowAddressForm(false);
       setEditingAddressId(null);
       fetchAddresses();"""

new_save = """       if (editingAddressId) {
         await api.put(`/auth/addresses/${editingAddressId}/`, addressForm);
       } else {
         const res = await api.post('/auth/addresses/', addressForm);
         setSelectedAddressId(res.data.id);
         // Immediately inject into local state to prevent race conditions during checkout
         setAddresses(prev => [...prev, res.data]);
       }
       setShowAddressForm(false);
       setEditingAddressId(null);
       fetchAddresses();"""

content = content.replace(old_save, new_save)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
