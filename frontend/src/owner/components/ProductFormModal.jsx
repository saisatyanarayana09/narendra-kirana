import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../../services/api';
import ImageCropper from './ImageCropper';
import { compressImage } from '../../utils/compress';

const ProductFormModal = ({ isOpen, onClose, editingProduct = null, categories: initialCategories = [], onSaveSuccess }) => {
  const [editingId, setEditingId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [formData, setFormData] = useState({
    name: '', category: '', brand: '', description: '', unit: '',
    regular_price: '', offer_price: '', is_active: true, is_in_stock: true,
    stock_quantity: 0, sku: '', cost_price: '', expiry_date: '', tags: '',
    max_order_quantity: 10, image: null, gallery_images: [], imageBack: null
  });

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setEditingId(editingProduct.id);
        setFormData({
          name: editingProduct.name, category: editingProduct.category || '', brand: editingProduct.brand || '',
          description: editingProduct.description || '', unit: editingProduct.unit, regular_price: editingProduct.regular_price,
          offer_price: editingProduct.offer_price || '', is_active: editingProduct.is_active, is_in_stock: editingProduct.is_in_stock,
          stock_quantity: editingProduct.stock_quantity || 0, sku: editingProduct.sku || '', cost_price: editingProduct.cost_price || '',
          expiry_date: editingProduct.expiry_date || '', tags: editingProduct.tags || '',
          max_order_quantity: editingProduct.max_order_quantity || 10, image: editingProduct.image || null, gallery_images: editingProduct.gallery_images || []
        });
      } else {
        setEditingId(null);
        setFormData({
          name: '', category: '', brand: '', description: '', unit: '', regular_price: '',
          offer_price: '', is_active: true, is_in_stock: true, stock_quantity: 0, sku: '', cost_price: '',
          expiry_date: '', tags: '', max_order_quantity: 10, image: null, gallery_images: [], imageBack: null
        });
      }

      if (categories.length === 0) {
        api.get('/categories/').then(res => {
          setCategories(res.data.results || res.data);
        }).catch(err => console.error("Failed to fetch categories", err));
      }
    }
  }, [isOpen, editingProduct]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (showScanner) {
      let scanner = null;
      try {
        scanner = new Html5QrcodeScanner('reader-modal', {
          qrbox: { width: 250, height: 100 },
          fps: 10,
          formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE ]
        }, false);
        
        scanner.render(
          (decodedText) => {
            setFormData(prev => ({...prev, sku: decodedText}));
            toast.success('Barcode scanned successfully!');
            setShowScanner(false);
            scanner.clear().catch(e => console.log(e));
          },
          (error) => {}
        );
      } catch(err) {
        console.warn('Scanner init error', err);
      }
      
      return () => {
        if (scanner) {
          scanner.clear().catch(e => console.log('Failed to clear scanner', e));
        }
      };
    }
  }, [showScanner]);

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      gallery_images: [...prev.gallery_images, ...files]
    }));
  };

  const handleRemoveGalleryImage = async (index, imageObj) => {
    if (imageObj.id && editingId) {
      if (!window.confirm('Delete this image permanently?')) return;
      try {
        const res = await api.delete(`/products/${editingId}/delete_gallery_image/`, {
          data: { image_id: imageObj.id }
        });
        if (res.data.success) {
          toast.success('Image deleted');
        }
      } catch (err) {
        toast.error('Failed to delete image');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();

    const toastId = toast.loading('Processing images...');

    try {
      if (formData.image instanceof File || formData.image instanceof Blob) {
        const compressedImg = await compressImage(formData.image);
        data.append('image', compressedImg, formData.image?.name || 'product.jpg');
      }

      Object.keys(formData).forEach(key => {
        if (key !== 'image' && key !== 'gallery_images' && formData[key] !== null && formData[key] !== '') {
          data.append(key, formData[key]);
        }
      });

      if (formData.gallery_images && formData.gallery_images.length > 0) {
        for (const file of formData.gallery_images) {
          if (file instanceof File || file instanceof Blob) {
            const compressedGalleryImg = await compressImage(file);
            data.append('gallery_images', compressedGalleryImg, file.name);
          }
        }
      }

      toast.loading('Uploading...', { id: toastId });
      const savePromise = editingId
        ? api.patch(`/products/${editingId}/`, data)
        : api.post('/products/', data);
      
      toast.promise(savePromise, {
        loading: formData.image instanceof File ? 'Uploading...' : 'Saving...',
        success: editingId ? 'Product updated!' : 'Product added!',
        error: 'Failed to save product. Check the inputs.'
      });
      
      await savePromise;
      onSaveSuccess();
      onClose();
    } catch (err) { 
      console.error(err); 
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 md:px-8 md:py-6 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{editingId ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 -mr-2 hover:bg-slate-50 rounded-full">
            <X className="w-6 h-6"/>
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
          <form id="productFormModal" onSubmit={handleSubmit} className="space-y-5">
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
                <label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                  <span>SKU / Barcode</span>
                  <button type="button" onClick={() => setShowScanner(!showScanner)} className="text-indigo-600 text-xs flex items-center hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded">
                    <Camera size={14} className="mr-1" /> Scan
                  </button>
                </label>
                <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Optional"/>
                {showScanner && (
                  <div className="mt-2 p-2 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div id="reader-modal" className="w-full"></div>
                    <button type="button" onClick={() => setShowScanner(false)} className="w-full mt-2 text-xs text-center text-red-500 font-bold py-1">Close Scanner</button>
                  </div>
                )}
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
            
            <div className="md:col-span-2 mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Gallery Images (Optional)</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {formData.gallery_images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                    <img 
                      src={img instanceof File || img instanceof Blob ? URL.createObjectURL(img) : (img.image || img)} 
                      className="w-full h-full object-cover" 
                      alt="Gallery item"
                    />
                    <button type="button" onClick={() => handleRemoveGalleryImage(idx, img)} className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-indigo-500">
                  <Plus className="w-6 h-6 mb-1"/>
                  <span className="text-xs font-medium">Add Photos</span>
                  <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" />
                </label>
              </div>
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
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">Cancel</button>
          <button type="submit" form="productFormModal" className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">{editingId ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </div>
    </div>
  , document.body);
};

export default ProductFormModal;
