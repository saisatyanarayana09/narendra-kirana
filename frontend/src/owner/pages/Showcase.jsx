import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Layout, Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import HomepageSectionEditor from '../components/HomepageSectionEditor';
import MidPageBannerEditor from '../components/MidPageBannerEditor';
import { createPortal } from 'react-dom';

export default function Showcase() {
  const [sections, setSections] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  const [savingBanners, setSavingBanners] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  // Rename modal
  const [renamingSection, setRenamingSection] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');

  const loadData = async () => {
    try {
      const [secRes, prodRes, annRes, banRes, setRes] = await Promise.all([
        api.get('/store/homepage-sections/'),
        api.get('/products/'),
        api.get('/store/announcements/'),
        api.get('/offers/banners/'),
        api.get('/store/settings/')
      ]);
      const mappedSections = secRes.data.map(sec => ({
          ...sec,
          items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
        }));
        setSections(mappedSections.sort((a, b) => a.display_order - b.display_order));
      const pList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results ?? []);
      setAllProducts(pList);
      setBanners(banRes.data.results || banRes.data || []);
      setSettings(setRes.data);
    } catch {
      toast.error('Failed to load showcase data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const handleAddBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', file.name || 'Banner');
    formData.append('display_order', banners.length);
    formData.append('is_active', true);
    
    const loadingToast = toast.loading('Uploading banner...');
    try {
      const res = await api.post('/offers/banners/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBanners([...banners, res.data]);
      toast.success('Banner added!', { id: loadingToast });
    } catch {
      toast.error('Failed to upload banner.', { id: loadingToast });
    }
    e.target.value = ''; // reset
  };
  
  const handleDeleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await api.delete(`/offers/banners/${id}/`);
      setBanners(banners.filter(a => a.id !== id));
      toast.success('Banner deleted!');
    } catch {
      toast.error('Failed to delete banner.');
    }
  };

  const handleToggleBanner = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/offers/banners/${id}/`, { is_active: !currentStatus });
      setBanners(banners.map(a => a.id === id ? res.data : a));
    } catch {
      toast.error('Failed to toggle banner.');
    }
  };
  
  const handleUpdateSetting = async (key, value) => {
    try {
      const res = await api.patch('/store/settings/', { [key]: value });
      setSettings(res.data);
      toast.success('Theme updated!');
    } catch {
      toast.error('Failed to update theme.');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'announcement') {
      const updated = Array.from(announcements);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      const newlyOrdered = updated.map((ann, idx) => ({ ...ann, display_order: idx }));
      setAnnouncements(newlyOrdered);
      setSavingAnnouncements(true);
      try {
        await api.post('/store/announcements/reorder/', newlyOrdered.map(a => ({ id: a.id, display_order: a.display_order })));
      } catch {
        toast.error('Failed to save announcement order.');
        loadData();
      } finally {
        setSavingAnnouncements(false);
      }
      return;
    }
    
    if (type === 'banner') {
      const updated = Array.from(banners);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      const newlyOrdered = updated.map((ann, idx) => ({ ...ann, display_order: idx }));
      setBanners(newlyOrdered);
      setSavingBanners(true);
      try {
        await api.post('/offers/banners/reorder/', newlyOrdered.map(a => ({ id: a.id, display_order: a.display_order })));
      } catch {
        toast.error('Failed to save banner order.');
        loadData();
      } finally {
        setSavingBanners(false);
      }
      return;
    }

    if (type === 'section') {
      const updated = Array.from(sections);
      const [moved] = updated.splice(source.index, 1);
      updated.splice(destination.index, 0, moved);
      
      const newlyOrdered = updated.map((sec, idx) => ({ ...sec, display_order: idx }));
      setSections(newlyOrdered);
      setSavingOrder(true);
      try {
        await api.post('/store/homepage-sections/reorder/', newlyOrdered.map(s => ({ id: s.id, display_order: s.display_order })));
        toast.success('Showcase layout saved!');
      } catch {
        toast.error('Failed to save layout.');
        loadData(); // revert
      } finally {
        setSavingOrder(false);
      }
    } else if (type === 'product') {
      // product drag
      const sectionIdStr = source.droppableId.replace('products-', '');
      const sectionId = parseInt(sectionIdStr, 10);
      const sectionIndex = sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) return;

      const sec = sections[sectionIndex];
      const updatedItems = Array.from(sec.items || []);
      const [movedItem] = updatedItems.splice(source.index, 1);
      updatedItems.splice(destination.index, 0, movedItem);

      // Reassign position internally (mostly for UI)
      updatedItems.forEach((item, idx) => { item.position = idx; });

      const newSections = [...sections];
      newSections[sectionIndex] = { ...sec, items: updatedItems };
      setSections(newSections);

      // Auto save the section's new product order
      try {
        await api.patch(`/store/homepage-sections/${sectionId}/`, {
          product_ids: updatedItems.map(i => i.id)
        });
      } catch {
        toast.error('Failed to save product order.');
      }
    }
  };

  const handleUpdateItems = (sectionId, newItems) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, items: newItems } : s));
  };

  const handleSaveSection = async (sectionId, items) => {
    try {
      await api.patch(`/store/homepage-sections/${sectionId}/`, {
        product_ids: items.map(i => i.id)
      });
    } catch {
      toast.error('Failed to save section.');
      throw new Error('Failed'); // let child component handle the error toast too if needed
    }
  };

  const handleAddSection = async () => {
    const title = window.prompt("Enter new section title:");
    if (!title) return;
    try {
      const res = await api.post('/store/homepage-sections/', { title, display_order: sections.length, is_active: true });
      setSections([...sections, { ...res.data, items: [] }]);
      toast.success('Section created!');
    } catch {
      toast.error('Failed to create section.');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return;
    try {
      await api.delete(`/store/homepage-sections/${id}/`);
      setSections(sections.filter(s => s.id !== id));
      toast.success('Section deleted!');
    } catch {
      toast.error('Failed to delete section.');
    }
  };

  const submitRename = async () => {
    if (!renameTitle || !renamingSection) return;
    try {
      const res = await api.patch(`/store/homepage-sections/${renamingSection.id}/`, { title: renameTitle });
      setSections(sections.map(s => s.id === renamingSection.id ? { ...s, title: res.data.title } : s));
      toast.success('Section renamed!');
      setRenamingSection(null);
    } catch {
      toast.error('Failed to rename section.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading showcase…</span>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storefront Showcase</h1>
          <p className="text-sm text-gray-500 mt-1">
            Curate the sections shown on the customer homepage. Drag to reorder sections, add new ones, or customize the products inside.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savingOrder && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-2 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving layout…
            </div>
          )}
          <button onClick={handleAddSection} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition">
            <Plus className="w-4 h-4" />
            Add Section
          </button>
        </div>
      </div>

      {/* How-to hint */}
      <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
        <Layout className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">
          <strong>Tip:</strong> Drag the <strong>≡ grip</strong> on any section card to change its position on the homepage.
          Inside each section, you can also drag products left and right to reorder them.
        </p>
      </div>


            {/* Promotional Banners */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Promotional Banners (Image Carousel)</h2>
            <p className="text-sm text-slate-500">Upload large promotional graphics for the image slider under the storefront header.</p>
          </div>
        </div>
        
        <div className="p-5">
          <Droppable droppableId="banners-list" type="banner">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {banners.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No promotional banners yet.</p>
                  ) : (
                    banners.map((ann, index) => (
                      <Draggable key={`ban-${ann.id}`} draggableId={`ban-${ann.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-3 bg-white border rounded-xl transition-all ${snapshot.isDragging ? 'shadow-lg border-indigo-300 ring-2 ring-indigo-100 z-50' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}
                          >
                            <div {...provided.dragHandleProps} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                              <GripVertical size={18} />
                            </div>
                            <div className="w-32 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                               {ann.image && <img src={ann.image} className="w-full h-full object-cover" alt="Banner" />}
                            </div>
                            <div className="flex-1 text-xs text-slate-500 truncate px-2">
                               {ann.title || 'Banner'}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleBanner(ann.id, ann.is_active)} className={`text-xs font-bold px-3 py-1 rounded-full ${ann.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {ann.is_active ? 'Active' : 'Hidden'}
                              </button>
                              <button onClick={() => handleDeleteBanner(ann.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          <label className="mt-4 flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold rounded-xl transition-colors text-sm cursor-pointer">
            <Plus size={16} className="mr-1" /> Upload New Image Banner
            <input type="file" accept="image/*" className="hidden" onChange={handleAddBanner} />
          </label>
        </div>
      </div>

      {/* Draggable section cards */}

      <Droppable droppableId="homepage-sections" type="section">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {sections.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-4">No showcase sections yet.</p>
                  <button onClick={handleAddSection} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100">
                    Create your first section
                  </button>
                </div>
              )}
              {sections.map((section, index) => (
                <Draggable key={`section-${section.id}`} draggableId={`section-${section.id}`} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                        snapshot.isDragging
                          ? 'shadow-2xl ring-2 ring-emerald-400'
                          : 'border-gray-200 shadow-sm'
                      }`}
                    >
                      {/* Section header */}
                      <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-300 hover:text-gray-600 transition rounded-lg hover:bg-gray-200"
                          title="Drag to reorder this section"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Title */}
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-base font-extrabold text-gray-900">
                            {section.title}
                          </span>
                          <button onClick={() => { setRenamingSection(section); setRenameTitle(section.title); }} className="text-gray-400 hover:text-emerald-600 p-1">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            #{index + 1} on homepage
                          </span>
                          <button onClick={() => handleDeleteSection(section.id)} className="text-gray-400 hover:text-red-600 p-1 bg-white border border-gray-200 rounded-md shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Section editor body */}
                      <div className="p-5">
                        {section.section_type === 'banner' ? (
                          <MidPageBannerEditor 
                            section={section}
                            onUpdateSection={(updated) => setSections(prev => prev.map(s => s.id === updated.id ? updated : s))}
                          />
                        ) : (
                          <HomepageSectionEditor
                            section={section}
                            allProducts={allProducts}
                            onUpdateItems={handleUpdateItems}
                            onSave={handleSaveSection}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

      {/* Rename Modal */}
      {renamingSection && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Rename Section</h3>
            <input 
              autoFocus
              type="text" 
              value={renameTitle} 
              onChange={e => setRenameTitle(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && submitRename()}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 mb-4" 
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRenamingSection(null)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={submitRename} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
      </DragDropContext>
  );
}
