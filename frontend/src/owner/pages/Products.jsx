import { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Package, GripVertical, ScanLine, Camera, Sparkles, Wand2, FileText } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import BarcodeScanner from '../../components/BarcodeScanner';
import { createPortal } from 'react-dom';

const Products = () => {
 const [products, setProducts] = useState([]);
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isScanning, setIsScanning] = useState(false);
 
 
 const [isFormOpen, setIsFormOpen] = useState(false);
   const [showScanner, setShowScanner] = useState(false);
 const [editingId, setEditingId] = useState(null);
 const [formData, setFormData] = useState({
 name: '', category: '', brand: '', description: '', unit: '',
 regular_price: '', offer_price: '', is_active: true, is_in_stock: true,
 stock_quantity: 0, sku: '', cost_price: '', expiry_date: '', tags: '',
 max_order_quantity: 10, image: null, imageBack: null
 });

 const fetchData = async () => {
 try {
 setLoading(true);
 const [prodRes, catRes] = await Promise.all([api.get('/products/'), api.get('/categories/')]);
 setProducts(prodRes.data.results || prodRes.data);
 setCategories(catRes.data.results || catRes.data);
 } catch { toast.error('Failed to load data.'); }
 finally { setLoading(false); }
 };

 useEffect(() => { fetchData(); }, []);

 const handleAIPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    toast.loading('AI is analyzing the product...', {id: 'ai-scan'});
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await api.post('/products/vision_lookup/', formData);
        toast.dismiss('ai-scan');
        if (res.data.success) {
            toast.success('AI successfully extracted details!');
            openForm(null);
            setTimeout(() => {
              setFormData(prev => ({
                  ...prev,
                  name: res.data.product.name || '',
                  brand: res.data.product.brand || '',
                  unit: res.data.product.unit || '',
                  description: res.data.product.description || ''
              }));
            }, 100);
        } else {
            toast.error(res.data.error || 'AI could not read the product.');
        }
    } catch (err) {
        toast.dismiss('ai-scan');
        toast.error('AI Scan failed. Check connection.');
    }
    e.target.value = '';
 };

 const handleBarcodeScan = async (decodedText) => {
    setIsScanning(false);
    toast.loading('Looking up product...', {id: 'scan-toast'});
    try {
        const res = await api.get(`/products/barcode_lookup/?barcode=${decodedText}`);
        toast.dismiss('scan-toast');
        if (res.data.source === 'local') {
            toast.success('Found in inventory! You can update stock.');
            openForm(res.data.product);
        } else if (res.data.source === 'external') {
            toast.success('Found product online! Auto-filling details...');
            openForm(null);
            setTimeout(() => {
              setFormData(prev => ({
                  ...prev,
                  name: res.data.product.name || '',
                  brand: res.data.product.brand || '',
                  unit: res.data.product.unit || '',
                  sku: res.data.product.sku || decodedText
              }));
            }, 100);
        } else {
            toast.error('Product not found. Please add manually.');
            openForm(null);
            setTimeout(() => setFormData(prev => ({ ...prev, sku: decodedText })), 100);
        }
    } catch (e) {
        toast.dismiss('scan-toast');
        toast.error('Error looking up barcode');
    }
 };

 const openForm = (product = null) => {
 if (product) {
 setEditingId(product.id);
 setFormData({
 name: product.name, category: product.category || '', brand: product.brand || '',
 description: product.description || '', unit: product.unit, regular_price: product.regular_price,
 offer_price: product.offer_price || '', is_active: product.is_active, is_in_stock: product.is_in_stock,
 stock_quantity: product.stock_quantity || 0, sku: product.sku || '', cost_price: product.cost_price || '',
 expiry_date: product.expiry_date || '', tags: product.tags || '',
 max_order_quantity: product.max_order_quantity || 10, image: product.image || null
 });
 } else {
 setEditingId(null);
 setFormData({ name: '', category: '', brand: '', description: '', unit: '', regular_price: '',
 offer_price: '', is_active: true, is_in_stock: true, stock_quantity: 0, sku: '', cost_price: '',
 expiry_date: '', tags: '', max_order_quantity: 10, image: null, imageBack: null });
 }
 setIsFormOpen(true);
 };

 const handleAnalyzeProduct = async () => {
   if (!formData.image || !(formData.image instanceof File || formData.image instanceof Blob)) {
     toast.error('Please upload a new image first.');
     return;
   }
   const toastId = toast.loading('Analyzing product...');
   try {
     const uploadData = new FormData();
     uploadData.append('image', formData.image);
     const res = await api.post('/products/analyze_image/', uploadData);
     if (res.data.success) {
       toast.success('Product details extracted!', { id: toastId });
       setFormData(prev => ({
         ...prev,
         name: res.data.data.name || prev.name,
         brand: res.data.data.brand || prev.brand,
         unit: res.data.data.unit || prev.unit,
         sku: res.data.data.sku || prev.sku,
         expiry_date: res.data.data.expiry_date || prev.expiry_date,
         regular_price: res.data.data.regular_price || prev.regular_price
       }));
       if (res.data.data.category) {
         const matchedCat = categories.find(c => c.name.toLowerCase().includes(res.data.data.category.toLowerCase()) || res.data.data.category.toLowerCase().includes(c.name.toLowerCase()));
         if (matchedCat) {
           setFormData(prev => ({...prev, category: matchedCat.id}));
         } else {
           toast('Suggested Category: ' + res.data.data.category + ' (No exact match)', { icon: 'ℹ️', duration: 4000 });
         }
       }
     } else {
       toast.error(res.data.error || 'Failed to analyze.', { id: toastId });
     }
   } catch (err) {
     toast.error('Analysis request failed.', { id: toastId });
   }
 };

 const handleGenerateDescription = async () => {
   const toastId = toast.loading('Generating description...');
   try {
     const res = await api.post('/products/generate_description/', {
       name: formData.name, brand: formData.brand, unit: formData.unit, 
       category: categories.find(c => String(c.id) === String(formData.category))?.name || ''
     });
     if (res.data.success) {
       toast.success('Description generated!', { id: toastId });
       setFormData(prev => ({ ...prev, description: res.data.description }));
     } else {
       toast.error(res.data.error || 'Failed to generate.', { id: toastId });
     }
   } catch (err) {
     toast.error('Generation request failed.', { id: toastId });
   }
 };


 const handleEnhanceImage = async () => {
   if (!formData.image || !(formData.image instanceof File || formData.image instanceof Blob)) {
     toast.error('Please upload a new image first.');
     return;
   }
   const toastId = toast.loading('Enhancing image (this may take a moment)...');
   try {
     const uploadData = new FormData();
     uploadData.append('image', formData.image);
     const res = await api.post('/products/enhance_image/', uploadData, { responseType: 'blob' });
     
     if (res.status === 200 && res.data.type.startsWith('image/')) {
       toast.success('Image enhanced successfully!', { id: toastId });
       const blobUrl = URL.createObjectURL(res.data);
       setEnhancedPreview({ url: blobUrl, blob: res.data });
     } else {
       toast.error('Failed to enhance image.', { id: toastId });
     }
   } catch (err) {
     toast.error('Enhancement request failed.', { id: toastId });
   }
 };


  const handleMagicAI = async () => {
    if (!formData.image && !formData.imageBack) {
      toast.error('Please upload at least one image first.');
      return;
    }
    const toastId = toast.loading('✨ AI is highly analyzing front & back details...');
    try {
      const formPayload = new FormData();
      if (formData.image instanceof File || formData.image instanceof Blob) {
          formPayload.append('imageFront', formData.image);
      }
      if (formData.imageBack instanceof File || formData.imageBack instanceof Blob) {
          formPayload.append('imageBack', formData.imageBack);
      }

      const analyzeRes = await api.post('/products/analyze_image/', formPayload);

      let newFormData = { ...formData };

      if (analyzeRes.data.success) {
        const extracted = analyzeRes.data.extracted_data || {};
        newFormData = {
          ...newFormData,
          name: extracted.name || newFormData.name,
          brand: extracted.brand || newFormData.brand,
          category: extracted.category || newFormData.category,
          unit: extracted.unit || newFormData.unit,
          regular_price: extracted.regular_price || extracted.price || newFormData.regular_price,
          stock_quantity: extracted.stock || newFormData.stock_quantity,
          sku: extracted.sku || newFormData.sku,
          expiry_date: extracted.expiry_date || newFormData.expiry_date,
        };
      }

      try {
          const descRes = await api.post('/products/generate_description/', newFormData);
          if (descRes.data.success) {
            newFormData.description = descRes.data.description || newFormData.description;
          }
      } catch (descErr) {
          console.warn("Description generation failed", descErr);
      }

      setFormData(newFormData);
      toast.success('✨ Product details extracted accurately!', { id: toastId });

    } catch (err) {
      toast.error('AI processing failed.', { id: toastId });
    }
  };

 const closeForm = () => { setIsFormOpen(false); setEditingId(null);  };

 const handleSubmit = async (e) => {
 e.preventDefault();
 const data = new FormData();
 Object.keys(formData).forEach(key => {
 if (key === 'image') {
 if (formData.image instanceof File || formData.image instanceof Blob) {
 data.append(key, formData.image, formData.image?.name || 'product.jpg');
 }
 } else if (formData[key] !== null && formData[key] !== '') {
 data.append(key, formData[key]);
 }
 });
 try {
 const savePromise = editingId
 ? api.patch(`/products/${editingId}/`, data)
 : api.post('/products/', data);
 toast.promise(savePromise, {
 loading: formData.image instanceof File ? 'Uploading...' : 'Saving...',
 success: editingId ? 'Product updated!' : 'Product added!',
 error: 'Failed to save product. Check the inputs.'
 });
 await savePromise;
 closeForm();
 fetchData();
 } catch (err) { console.error(err); }
 };

 const handleDelete = async (id) => {
 if (window.confirm('Are you sure you want to delete this product?')) {
 try {
 await api.delete(`/products/${id}/`);
 toast.success('Product deleted');
 fetchData();
 } catch { toast.error('Failed to delete product.'); }
 }
 };

 const onDragEnd = async (result) => {
 if (!result.destination) return;
 const items = Array.from(products);
 const [reorderedItem] = items.splice(result.source.index, 1);
 items.splice(result.destination.index, 0, reorderedItem);
 setProducts(items);
 const updates = items.map((item, index) => ({ id: item.id, display_order: index }));
 try {
 await api.post('/products/reorder/', updates);
 toast.success('Order updated', { position: 'bottom-right', id: 'reorder-toast-prod' });
 } catch { toast.error('Failed to save order'); fetchData(); }
 };

 if (loading && products.length === 0) return <div className="p-4">Loading products...</div>;

 return (
 <div className="max-w-7xl mx-auto space-y-6">
   <div className="flex justify-between items-center">
   <h1 className="text-2xl font-bold text-gray-900">Products</h1>
   <div className="flex gap-2">
     <input type="file" accept="image/*" capture="environment" id="ai-photo-upload" className="hidden" onChange={handleAIPhotoUpload} />
     <button onClick={() => document.getElementById('ai-photo-upload').click()} className="flex items-center px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition shadow-sm">
       <Camera className="w-5 h-5 sm:mr-2"/><span className="hidden sm:inline">AI Scan</span>
     </button>
     <button onClick={() => setIsScanning(true)} className="flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition shadow-sm">
       <ScanLine className="w-5 h-5 sm:mr-2"/><span className="hidden sm:inline">Scan Barcode</span>
     </button>
     <button onClick={() => openForm()} className="flex items-center px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm">
       <Plus className="w-5 h-5 sm:mr-2"/><span className="hidden sm:inline">Add Product</span>
     </button>
   </div>
   </div>

 {isFormOpen && createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
 <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
 <div className="flex justify-between items-center p-6 md:px-8 md:py-6 border-b border-slate-100 flex-shrink-0">
 <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{editingId ? 'Edit Product' : 'New Product'}</h2>
 <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-2 -mr-2 hover:bg-slate-50 rounded-full">
 <X className="w-6 h-6"/>
 </button>
 </div>
 <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
 <form id="productForm" onSubmit={handleSubmit} className="space-y-5">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Name</label>
 <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Aashirvaad Atta"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
 <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
 <option value="">Select Category</option>
 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Brand</label>
 <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. ITC"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Unit / Size</label>
 <input type="text" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. 1 kg, 500 g"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">MRP (₹)</label>
 <input type="number" step="0.01" required value={formData.regular_price} onChange={e => setFormData({...formData, regular_price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Special Price (₹)</label>
 <input type="number" step="0.01" value={formData.offer_price} onChange={e => setFormData({...formData, offer_price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Leave blank if no offer"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Cost Price (₹)</label>
 <input type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional (For profit tracking)"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Stock Quantity</label>
 <input type="number" required value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">SKU / Barcode</label>
 <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Expiry Date</label>
 <input type="date" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Tags (Comma Separated)</label>
 <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Bestseller, Organic"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Max Order Quantity</label>
 <input type="number" value={formData.max_order_quantity} onChange={e => setFormData({...formData, max_order_quantity: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Limit per user"/>
 </div>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
 <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" rows="2"/>
 </div>
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-1.5">Product Image <span className="text-slate-400 font-medium">(Square 1:1)</span></label>
 <ImageCropper
 aspect={1}
 label="Upload Photo"
 currentImageUrl={
 formData.image && (formData.image instanceof File || formData.image instanceof Blob)
 ? URL.createObjectURL(formData.image)
 : typeof formData.image === 'string' ? formData.image : null
 }
 onCropComplete={(file) => setFormData({...formData, image: file})}
 />
 </div>
   {/* Smart AI Creation Panel */}
   <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 mt-2">
     <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-indigo-600" size={20} />
        <h3 className="font-extrabold text-indigo-900 text-sm sm:text-base">AI Product Assistant</h3>
     </div>
     <p className="text-xs sm:text-sm text-indigo-700/80 font-medium mb-4">
        Upload a product photo above, then use AI to instantly fill out the details, write a description, and enhance the image quality.
     </p>
     <div className="flex flex-wrap gap-2.5">
         <button type="button" onClick={handleMagicAI} className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md transform hover:-translate-y-0.5">
            <Sparkles size={18} /> 1-Click AI Auto-Fill & Studio Render
         </button>
       </div>
     
     {enhancedPreview && (
       <div className="mt-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex gap-4 flex-1 justify-center sm:justify-start">
             <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Original</p>
                <img src={URL.createObjectURL(formData.image)} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm border border-slate-100" />
             </div>
             <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mb-1.5">✨ Enhanced</p>
                <img src={enhancedPreview.url} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg shadow-sm border-2 border-emerald-400" />
             </div>
          </div>
          <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
             <button type="button" onClick={() => {
                 const file = new File([enhancedPreview.blob], 'enhanced.jpg', { type: 'image/jpeg' });
                 setFormData({...formData, image: file});
                 
                 toast.success('Enhanced image applied!');
             }} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm">Use Enhanced</button>
             <button type="button" onClick={() => setEnhancedPreview(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition">Keep Original</button>
          </div>
       </div>
     )}
   </div>
   <div className="flex items-center space-x-6 pt-4 md:col-span-2">
 <div className="flex items-center">
 <input type="checkbox" id="isActiveProd" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"/>
 <label htmlFor="isActiveProd" className="ml-2 text-sm text-gray-900">Active (Visible)</label>
 </div>
 <div className="flex items-center">
 <input type="checkbox" id="inStock" checked={formData.is_in_stock} onChange={e => setFormData({...formData, is_in_stock: e.target.checked})} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"/>
 <label htmlFor="inStock" className="ml-2 text-sm text-gray-900">In Stock</label>
 </div>
 </div>
 </form>
 </div>
 <div className="p-6 md:px-8 md:py-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 flex-shrink-0 rounded-b-2xl">
 <button type="button" onClick={closeForm} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
 <button type="submit" form="productForm" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">{editingId ? 'Save Changes' : 'Add Product'}</button>
 </div>
 </div>
 </div>
 , document.body)}

 {/* Products List */}
 {products.length > 0 ? (
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
 <DragDropContext onDragEnd={onDragEnd}>
 <Droppable droppableId="products">
 {(provided) => (
 <div className="divide-y divide-slate-100" {...provided.droppableProps} ref={provided.innerRef}>
 {products.map((product, index) => (
 <Draggable key={product.id} draggableId={product.id.toString()} index={index}>
 {(provided, snapshot) => (
 <div
 ref={provided.innerRef}
 {...provided.draggableProps}
 className={`p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group ${snapshot.isDragging ? 'bg-indigo-50 shadow-lg ring-1 ring-indigo-500 z-10' : ''}`}
 style={provided.draggableProps.style}
 >
 <div className="flex items-center gap-4 min-w-0 flex-1">
 <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 text-slate-400">
 <GripVertical className="w-5 h-5"/>
 </div>
 <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 group-hover:border-indigo-100 transition-colors">
 {product.image ? (
 <img loading='lazy' decoding='async' src={product.image} alt={product.name} className="w-full h-full object-contain p-1 transition-transform duration-500 group-hover:scale-110"/>
 ) : (
 <ImageIcon className="w-8 h-8 text-slate-300"/>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest">{product.category_name}</span>
 <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{product.is_active ? 'Active' : 'Hidden'}</span>
 <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${product.stock_quantity > 0 ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{product.stock_quantity > 0 ? `Stock: ${product.stock_quantity}` : 'Out of Stock'}</span>
 {product.sku && <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider bg-slate-100 text-slate-500">SKU: {product.sku}</span>}
 </div>
 <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{product.name}</h3>
 <div className="text-sm text-slate-500 font-medium truncate mt-0.5">{product.unit} {product.brand && `• ${product.brand}`}</div>
 </div>
 </div>
 <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-64 flex-shrink-0 border-t sm:border-0 pt-3 sm:pt-0">
 <div className="flex flex-col sm:items-end">
 {product.offer_price ? (
 <><span className="text-lg font-extrabold text-slate-900 tracking-tight">₹{product.offer_price}</span><span className="text-xs font-bold text-slate-400 line-through">₹{product.regular_price}</span></>
 ) : (
 <span className="text-lg font-extrabold text-slate-900 tracking-tight">₹{product.regular_price}</span>
 )}
 </div>
 <div className="flex items-center space-x-2">
 <button onClick={() => openForm(product)} className="p-2 sm:px-4 sm:py-2 flex items-center text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-colors">
 <Edit2 className="w-4 h-4 sm:mr-1.5"/><span className="hidden sm:inline">Edit</span>
 </button>
 <button onClick={() => handleDelete(product.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-colors">
 <Trash2 className="w-5 h-5"/>
 </button>
 </div>
 </div>
 </div>
 )}
 </Draggable>
 ))}
 {provided.placeholder}
 </div>
 )}
 </Droppable>
 </DragDropContext>
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
 <Package className="w-8 h-8 text-slate-400"/>
 </div>
 <h3 className="text-lg font-bold text-slate-900">No products found</h3>
 <p className="text-slate-500 mt-1 mb-6">Get started by adding your first product to the catalog.</p>
 <button onClick={() => openForm()} className="flex items-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
 <Plus className="w-5 h-5 mr-2"/>Add Product
 </button>
 </div>
 )}
 {isScanning && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setIsScanning(false)} />}
 </div>
 );
};

export default Products;
