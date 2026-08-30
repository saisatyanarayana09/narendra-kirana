import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add states for announcements
state_injection = """  const [sections, setSections] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState(null);
  const [savingAnnouncements, setSavingAnnouncements] = useState(false);"""
content = re.sub(r'  const \[sections, setSections\] = useState\(\[\]\);', state_injection, content)

# Update loadData to fetch announcements and settings
loaddata_old = """      const [secRes, prodRes] = await Promise.all([
        api.get('/store/homepage-sections/'),
        api.get('/products/')
      ]);
      setSections(secRes.data.sort((a, b) => a.display_order - b.display_order));
      const pList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results ?? []);
      setAllProducts(pList);"""
loaddata_new = """      const [secRes, prodRes, annRes, setRes] = await Promise.all([
        api.get('/store/homepage-sections/'),
        api.get('/products/'),
        api.get('/store/announcements/'),
        api.get('/store/settings/')
      ]);
      setSections(secRes.data.sort((a, b) => a.display_order - b.display_order));
      const pList = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.results ?? []);
      setAllProducts(pList);
      setAnnouncements(annRes.data || []);
      setSettings(setRes.data);"""
content = content.replace(loaddata_old, loaddata_new)

# Add Announcement Handlers
ann_handlers = """
  const handleAddAnnouncement = async () => {
    const text = window.prompt("Enter flash announcement text:");
    if (!text) return;
    try {
      const res = await api.post('/store/announcements/', { text, display_order: announcements.length, is_active: true });
      setAnnouncements([...announcements, res.data]);
      toast.success('Announcement added!');
    } catch {
      toast.error('Failed to add announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await api.delete(/store/announcements//);
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast.success('Announcement deleted!');
    } catch {
      toast.error('Failed to delete announcement.');
    }
  };

  const handleToggleAnnouncement = async (id, currentStatus) => {
    try {
      const res = await api.patch(/store/announcements//, { is_active: !currentStatus });
      setAnnouncements(announcements.map(a => a.id === id ? res.data : a));
    } catch {
      toast.error('Failed to toggle announcement.');
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

  const handleDragEnd = async (result) => {"""
content = content.replace("  const handleDragEnd = async (result) => {", ann_handlers)

# Handle announcement drag-drop inside handleDragEnd
dragend_ann = """    if (type === 'announcement') {
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

    if (type === 'section') {"""
content = content.replace("    if (type === 'section') {", dragend_ann)

# Inject Announcement UI
ann_ui = """
      {/* Flash Announcements */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Flash Announcements Ticker</h2>
            <p className="text-sm text-slate-500">Manage the scrolling marquee at the very top of your store.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <label className="text-xs font-bold text-slate-600">Background</label>
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
                    <p className="text-sm text-slate-400 text-center py-4">No announcements running.</p>
                  ) : (
                    announcements.map((ann, index) => (
                      <Draggable key={ann.id.toString()} draggableId={nn-} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={lex items-center gap-3 p-3 bg-white border rounded-xl transition-all }
                          >
                            <div {...provided.dragHandleProps} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                              <GripVertical size={18} />
                            </div>
                            <div className="flex-1 font-medium text-sm text-slate-800">
                              {ann.text}
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleToggleAnnouncement(ann.id, ann.is_active)} className={	ext-xs font-bold px-3 py-1 rounded-full }>
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
            <Plus size={16} className="mr-1" /> Add New Announcement
          </button>
        </div>
      </div>

      {/* Draggable section cards */}
"""
content = content.replace("      {/* Draggable section cards */}", ann_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
