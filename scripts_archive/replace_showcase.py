import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Change endpoints
content = content.replace('/store/announcements/', '/store/promo-banners/')

# Replace the handler for adding (we need image upload)
old_add_handler = """  const handleAddAnnouncement = async () => {
    const text = window.prompt("Enter flash announcement text:");
    if (!text) return;
    try {
      const res = await api.post('/store/promo-banners/', { text, display_order: announcements.length, is_active: true });
      setAnnouncements([...announcements, res.data]);
      toast.success('Announcement added!');
    } catch {
      toast.error('Failed to add announcement.');
    }
  };"""

new_add_handler = """  const handleAddBanner = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('display_order', announcements.length);
    formData.append('is_active', true);
    
    const loadingToast = toast.loading('Uploading banner...');
    try {
      const res = await api.post('/store/promo-banners/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAnnouncements([...announcements, res.data]);
      toast.success('Banner added!', { id: loadingToast });
    } catch {
      toast.error('Failed to upload banner.', { id: loadingToast });
    }
    e.target.value = ''; // reset
  };"""

content = content.replace(old_add_handler, new_add_handler)

# Fix UI for Promo Banners
old_ui = r'\{\/\* Flash Announcements \*\/\}[\s\S]*?\{\/\* Draggable section cards \*\/\}'

new_ui = """      {/* Promotional Banners */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Promotional Banners (Carousel)</h2>
            <p className="text-sm text-slate-500">Upload large promotional graphics for the top of the storefront homepage.</p>
          </div>
        </div>
        
        <div className="p-5">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="announcements-list" type="announcement">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No promotional banners yet.</p>
                  ) : (
                    announcements.map((ann, index) => (
                      <Draggable key={ann.id.toString()} draggableId={`ann-${ann.id}`} index={index}>
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
                               {ann.image ? ann.image.split('/').pop() : 'No image'}
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
          <label className="mt-4 flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 font-bold rounded-xl transition-colors text-sm cursor-pointer">
            <Plus size={16} className="mr-1" /> Upload New Banner
            <input type="file" accept="image/*" className="hidden" onChange={handleAddBanner} />
          </label>
        </div>
      </div>

      {/* Draggable section cards */}"""

content = re.sub(old_ui, new_ui, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
