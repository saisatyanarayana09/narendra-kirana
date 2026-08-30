import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Flash Announcements state back
state_replace = """  const [sections, setSections] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  const [savingAnnouncements, setSavingAnnouncements] = useState(false);
  const [savingBanners, setSavingBanners] = useState(false);"""
content = re.sub(r'  const \[sections, setSections\] = useState\(\[\]\);\n  const \[announcements, setAnnouncements\] = useState\(\[\]\);\n  const \[settings, setSettings\] = useState\(null\);\n  const \[savingAnnouncements, setSavingAnnouncements\] = useState\(false\);', state_replace, content)

fetch_replace = """      const [secRes, prodRes, annRes, banRes, setRes] = await Promise.all([
        api.get('/store/homepage-sections/'),
        api.get('/products/'),
        api.get('/store/announcements/'),
        api.get('/offers/banners/'),
        api.get('/store/settings/')
      ]);
      setSections(secRes.data.sort((a, b) => a.display_order - b.display_order));
      const pList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results ?? []);
      setAllProducts(pList);
      setAnnouncements(annRes.data || []);
      setBanners(banRes.data.results || banRes.data || []);
      setSettings(setRes.data);"""
content = re.sub(r'      const \[secRes, prodRes, annRes, setRes\] = await Promise\.all\(\[\s*api\.get\(\'/store/homepage-sections/\'\),\s*api\.get\(\'/products/\'\),\s*api\.get\(\'/offers/banners/\'\),\s*api\.get\(\'/store/settings/\'\)\s*\]\);\s*setSections\(secRes\.data\.sort\(\(a, b\) => a\.display_order - b\.display_order\)\);\s*const pList = Array\.isArray\(prodRes\.data\) \? prodRes\.data : \(prodRes\.data\?\.results \?\? \[\]\);\s*setAllProducts\(pList\);\s*setAnnouncements\(annRes\.data \|\| \[\]\);\s*setSettings\(setRes\.data\);', fetch_replace, content)

handlers_replace = """  const handleAddAnnouncement = async () => {
    const text = window.prompt("Enter flash announcement text:");
    if (!text) return;
    try {
      const res = await api.post('/store/announcements/', { text, display_order: announcements.length, is_active: true });
      setAnnouncements([...announcements, res.data]);
      toast.success('Text announcement added!');
    } catch {
      toast.error('Failed to add announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(`/store/announcements/${id}/`);
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast.success('Announcement deleted!');
    } catch {
      toast.error('Failed to delete announcement.');
    }
  };

  const handleToggleAnnouncement = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/store/announcements/${id}/`, { is_active: !currentStatus });
      setAnnouncements(announcements.map(a => a.id === id ? res.data : a));
    } catch {
      toast.error('Failed to toggle announcement.');
    }
  };

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
  };"""

content = re.sub(r'  const handleAddBanner = async \(e\) => \{[\s\S]*?const handleUpdateSetting = async \(key, value\) => \{[\s\S]*?  \};', handlers_replace, content)

drag_end_replace = """    if (type === 'announcement') {
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
    }"""
content = re.sub(r'    if \(type === \'announcement\'\) \{[\s\S]*?      return;\n    \}', drag_end_replace, content)

ui_replace = """      {/* Text Flash Announcements */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Live Flash Announcements (Text Marquee)</h2>
            <p className="text-sm text-slate-500">Manage the scrolling text ticker at the very top of your store.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-600">Bg</label>
              <input type="color" value={settings?.announcement_bg_color || '#ef4444'} onBlur={(e) => handleUpdateSetting('announcement_bg_color', e.target.value)} onChange={(e) => setSettings({...settings, announcement_bg_color: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-600">Text</label>
              <input type="color" value={settings?.announcement_text_color || '#ffffff'} onBlur={(e) => handleUpdateSetting('announcement_text_color', e.target.value)} onChange={(e) => setSettings({...settings, announcement_text_color: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
            </div>
          </div>
        </div>
        
        <div className="p-5">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="announcements-list" type="announcement">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No text announcements running.</p>
                  ) : (
                    announcements.map((ann, index) => (
                      <Draggable key={`ann-${ann.id}`} draggableId={`ann-${ann.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-3 bg-white border rounded-xl transition-all ${snapshot.isDragging ? 'shadow-lg border-indigo-300 ring-2 ring-indigo-100 z-50' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}
                          >
                            <div {...provided.dragHandleProps} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                              <GripVertical size={18} />
                            </div>
                            <div className="flex-1 font-medium text-sm text-slate-800 truncate">
                              {ann.text}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)} className={`text-xs font-bold px-3 py-1 rounded-full ${ann.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {ann.is_active ? 'Active' : 'Hidden'}
                              </button>
                              <button onClick={() => handleDeleteAnnouncement(ann.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
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
          </DragDropContext>
          <button onClick={handleAddAnnouncement} className="mt-4 flex items-center justify-center w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold rounded-xl transition-colors text-sm">
            <Plus size={16} className="mr-1" /> Add New Text Announcement
          </button>
        </div>
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
          <DragDropContext onDragEnd={handleDragEnd}>
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
          </DragDropContext>
          <label className="mt-4 flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold rounded-xl transition-colors text-sm cursor-pointer">
            <Plus size={16} className="mr-1" /> Upload New Image Banner
            <input type="file" accept="image/*" className="hidden" onChange={handleAddBanner} />
          </label>
        </div>
      </div>"""

content = re.sub(r'      \{\/\* Promotional Banners \*\/\}[\s\S]*?\{\/\* Draggable section cards \*\/\}', ui_replace + '\n\n      {/* Draggable section cards */}', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
