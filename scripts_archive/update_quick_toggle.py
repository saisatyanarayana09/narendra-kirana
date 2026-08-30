import os
import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the handleToggleStock function
if "const handleToggleStock = async" not in content:
    old_handleDelete = "   const handleDelete = async (id) => {"
    new_handleToggleStock = """   const handleToggleStock = async (product) => {
   const newStatus = !product.is_in_stock;
   const loadingToast = toast.loading('Updating stock status...');
   try {
     await api.patch(`/products/${product.id}/`, { is_in_stock: newStatus });
     setProducts(products.map(p => p.id === product.id ? { ...p, is_in_stock: newStatus } : p));
     toast.success(newStatus ? 'Marked as In Stock' : 'Marked as Out of Stock', { id: loadingToast });
   } catch {
     toast.error('Failed to update stock status', { id: loadingToast });
   }
   };
   
   const handleDelete = async (id) => {"""
    content = content.replace(old_handleDelete, new_handleToggleStock)

# Add the quick toggle button
old_buttons = """   <div className="flex items-center space-x-2">
   <button onClick={() => openForm(product)} className="p-2 sm:px-4 sm:py-2 flex items-center text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors">
   <Edit2 className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Edit</span>
   </button>"""

new_buttons = """   <div className="flex items-center space-x-2">
   <button onClick={() => handleToggleStock(product)} className={`p-2 sm:px-3 sm:py-2 flex items-center text-sm font-bold rounded-xl transition-colors border ${product.is_in_stock ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-600 hover:text-white' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-emerald-500 hover:text-white'}`} title={product.is_in_stock ? "Mark Out of Stock" : "Mark In Stock"}>
   <Package className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">{product.is_in_stock ? "In Stock" : "Out of Stock"}</span>
   </button>
   <button onClick={() => openForm(product)} className="p-2 sm:px-4 sm:py-2 flex items-center text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors">
   <Edit2 className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Edit</span>
   </button>"""

if old_buttons in content:
    content = content.replace(old_buttons, new_buttons)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
