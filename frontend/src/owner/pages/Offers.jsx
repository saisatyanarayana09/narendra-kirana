import { useEffect, useState } from 'react';
import { Tag, Image as ImageIcon, Plus, Trash2, GripVertical, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import { createPortal } from 'react-dom';

const Offers = () => {
 const [promos, setPromos] = useState([]);
 const [banners, setBanners] = useState([]);
 const [categories, setCategories] = useState([]);
 
 const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
 const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
 
 // Promo code form
 const [promoForm, setPromoForm] = useState({ code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '0', applicable_category: '', is_active: true });
 
 // Banner form
 const [bannerForm, setBannerForm] = useState({ title: '', link: '', is_active: true });
 const [bannerFile, setBannerFile] = useState(null);

 useEffect(() => {
 fetchPromos();
 fetchBanners();
 fetchCategories();
 }, []);

 const fetchPromos = () => api.get('/offers/promocodes/').then(res => setPromos(res.data.results || res.data)).catch(console.error);
 const fetchBanners = () => api.get('/offers/banners/').then(res => setBanners(res.data.results || res.data)).catch(console.error);
 const fetchCategories = () => api.get('/products/categories/').then(res => setCategories(res.data.results || res.data)).catch(console.error);

 const handlePromoSubmit = async (e) => {
 e.preventDefault();
 try {
 const payload = { ...promoForm };
 if (!payload.applicable_category) delete payload.applicable_category;
 await api.post('/offers/promocodes/', payload);
 setPromoForm({ code: '', discount_type: 'PERCENTAGE', discount_value: '', min_order_amount: '0', applicable_category: '', is_active: true });
 setIsPromoModalOpen(false);
 fetchPromos();
 } catch (err) {
 alert(err.response?.data?.code?.[0] || 'Error creating promo code');
 }
 };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerFile) return toast.error('Please select and crop an image');
    
    const formData = new FormData();
    formData.append('title', bannerForm.title);
    if (bannerForm.link) {
      formData.append('link', bannerForm.link);
    }
    formData.append('is_active', bannerForm.is_active);
    formData.append('image', bannerFile, bannerFile.name);

    const uploadPromise = api.post('/offers/banners/', formData);

    toast.promise(uploadPromise, {
      loading: 'Uploading...',
      success: 'Banner uploaded successfully!',
      error: 'Error creating banner.'
    });

    try {
      await uploadPromise;
      setBannerForm({ title: '', link: '', is_active: true });
      setBannerFile(null);
      setIsBannerModalOpen(false);
      e.target.reset();
      fetchBanners();
    } catch (err) {
      console.error('Banner upload error:', err.response || err);
    }
  };

 const deletePromo = async (id) => {
 if (!window.confirm('Delete this promo code?')) return;
 await api.delete(`/offers/promocodes/${id}/`);
 fetchPromos();
 };

  const deleteBanner = async (id) => {
  if (!window.confirm('Delete this banner?')) return;
  await api.delete(`/offers/banners/${id}/`);
  fetchBanners();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const items = Array.from(banners);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBanners(items);

    const updates = items.map((item, index) => ({
      id: item.id,
      display_order: index
    }));

    try {
      await api.post('/offers/banners/reorder/', updates);
      toast.success('Order updated instantly', { position: 'bottom-right', id: 'reorder-toast-banner' });
    } catch (error) {
      toast.error('Failed to save order');
      fetchBanners();
    }
  };

 return (
  <div className="max-w-7xl mx-auto space-y-12 pb-12">
    {/* Page Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing & Offers</h1>
        <p className="text-gray-500 text-sm mt-1">Manage promotional banners and discount codes.</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setIsPromoModalOpen(true)} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
          <Tag size={18} /> Add Promo Code
        </button>
        <button onClick={() => setIsBannerModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={18} /> Add Banner
        </button>
      </div>
    </div>

    {/* Banners List */}
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Storefront Banners</h2>
      </div>

      {banners.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="banners">
              {(provided) => (
                <div 
                  className="divide-y divide-slate-100"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {banners.map((banner, index) => (
                    <Draggable key={banner.id} draggableId={banner.id.toString()} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group ${snapshot.isDragging ? 'bg-indigo-50 shadow-lg ring-1 ring-indigo-500 z-10' : ''}`}
                          style={provided.draggableProps.style}
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-200 text-slate-400">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            
                            <div className="w-32 h-12 sm:w-48 sm:h-16 flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                            </div>
                            
                            <div className="min-w-0 flex-1 ml-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${banner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                  {banner.is_active ? 'Active' : 'Hidden'}
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-slate-900 truncate">{banner.title}</h3>
                              {banner.link && (
                                <div className="text-sm text-indigo-500 font-medium truncate mt-0.5">{banner.link}</div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-32 flex-shrink-0 border-t sm:border-0 pt-3 sm:pt-0">
                            <button onClick={() => deleteBanner(banner.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-colors">
                              <Trash2 className="w-5 h-5"/>
                            </button>
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
        <div className="bg-white py-12 px-6 rounded-2xl border border-slate-100 text-center shadow-sm">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No storefront banners</h3>
          <p className="text-slate-500 text-sm mt-1">Upload landscape banners for your customers.</p>
        </div>
      )}
    </section>

    {/* Promo Codes List */}
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Active Promo Codes</h2>
      </div>

      {promos.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
          {promos.map(promo => (
            <div key={promo.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-12 h-12 flex-shrink-0 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <Tag className="w-5 h-5" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-slate-900 uppercase tracking-widest">{promo.code}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${promo.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {promo.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 font-medium flex items-center gap-4 flex-wrap">
                    <span>Discount: <strong className="text-slate-700">{promo.discount_type === 'PERCENTAGE' ? `${promo.discount_value}%` : `Rs. ${promo.discount_value}`}</strong></span>
                    <span>Min. Order: <strong className="text-slate-700">Rs. {promo.min_order_amount}</strong></span>
                    {promo.applicable_category && <span>Category: <strong className="text-slate-700">{categories.find(c => c.id === promo.applicable_category)?.name || 'Specific'}</strong></span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-32 flex-shrink-0 border-t sm:border-0 pt-3 sm:pt-0">
                <button onClick={() => deletePromo(promo.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white py-12 px-6 rounded-2xl border border-slate-100 text-center shadow-sm">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No promo codes</h3>
          <p className="text-slate-500 text-sm mt-1">Create your first discount code.</p>
        </div>
      )}
    </section>

  {/* Promo Code Modal */}
  {isPromoModalOpen && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Add Promo Code</h2>
          <button onClick={() => setIsPromoModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 -mr-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handlePromoSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Discount Code</label>
              <input required value={promoForm.code} onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} className="w-full uppercase bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold tracking-wider" placeholder="e.g. WELCOME10"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Discount Type</label>
                <select value={promoForm.discount_type} onChange={e => setPromoForm({...promoForm, discount_type: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FLAT">Flat (Rs)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Value</label>
                <input required type="number" min="0" step="0.01" value={promoForm.discount_value} onChange={e => setPromoForm({...promoForm, discount_value: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Minimum Order (Rs)</label>
              <input required type="number" min="0" step="0.01" value={promoForm.min_order_amount} onChange={e => setPromoForm({...promoForm, min_order_amount: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Applicable Category <span className="text-slate-400 font-normal">(Optional)</span></label>
              <select value={promoForm.applicable_category} onChange={e => setPromoForm({...promoForm, applicable_category: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium">
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={promoForm.is_active} onChange={e => setPromoForm({...promoForm, is_active: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"/>
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                Add Code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  , document.body)}

  {/* Banner Modal */}
  {isBannerModalOpen && createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Add Banner</h2>
          <button onClick={() => setIsBannerModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 -mr-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleBannerSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Banner Title</label>
              <input required value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Link URL <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input type="url" value={bannerForm.link} onChange={e => setBannerForm({...bannerForm, link: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Banner Image (3:1)</label>
              <div className="bg-slate-50 p-2 border border-slate-200 rounded-xl">
                <ImageCropper onCropComplete={setBannerFile} aspect={3} />
              </div>
            </div>
            <label className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={bannerForm.is_active} onChange={e => setBannerForm({...bannerForm, is_active: e.target.checked})} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"/>
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                Upload
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  , document.body)}

  </div>
  );
};

export default Offers;
