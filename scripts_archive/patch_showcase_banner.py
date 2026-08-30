import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
content = content.replace("import HomepageSectionEditor from '../components/HomepageSectionEditor';", "import HomepageSectionEditor from '../components/HomepageSectionEditor';\nimport MidPageBannerEditor from '../components/MidPageBannerEditor';")

# Add handleAddBannerSection
add_section_str = '''
  const handleAddSection = async () => {
    const title = window.prompt("Enter new section title:");
    if (!title) return;
    try {
      const res = await api.post('/store/homepage-sections/', { title, section_type: 'products', display_order: sections.length, is_active: true });
      setSections([...sections, { ...res.data, items: [] }]);
      toast.success('Section created!');
    } catch {
      toast.error('Failed to create section.');
    }
  };'''

new_add_section_str = '''
  const handleAddSection = async () => {
    const title = window.prompt("Enter new product section title (e.g. 'Trending'):");
    if (!title) return;
    try {
      const res = await api.post('/store/homepage-sections/', { title, section_type: 'products', display_order: sections.length, is_active: true });
      setSections([...sections, { ...res.data, items: [] }]);
      toast.success('Section created!');
    } catch {
      toast.error('Failed to create section.');
    }
  };

  const handleAddMidPageBanner = async () => {
    const title = window.prompt("Enter an internal name for this banner (e.g. 'Snacks Fest Promo'):");
    if (!title) return;
    try {
      const res = await api.post('/store/homepage-sections/', { title, section_type: 'banner', display_order: sections.length, is_active: true });
      setSections([...sections, { ...res.data, items: [] }]);
      toast.success('Mid-Page Banner created!');
    } catch {
      toast.error('Failed to create banner.');
    }
  };'''

content = content.replace(add_section_str.strip(), new_add_section_str.strip())

# Add the button
btn_str = '''            <button onClick={handleAddSection} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition">
              <Plus className="w-4 h-4" />
              Add Section
            </button>'''

new_btn_str = '''            <button onClick={handleAddMidPageBanner} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
              <ImageIcon className="w-4 h-4" />
              Add Mid-Page Banner
            </button>
            <button onClick={handleAddSection} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition">
              <Plus className="w-4 h-4" />
              Add Section
            </button>'''
content = content.replace(btn_str, new_btn_str)

# Ensure ImageIcon is imported
if 'Image as ImageIcon' not in content:
    content = content.replace("import { Layout, GripVertical, Plus, Edit2, Trash2, Save, Loader2, ArrowRightLeft } from 'lucide-react';", "import { Layout, GripVertical, Plus, Edit2, Trash2, Save, Loader2, ArrowRightLeft, Image as ImageIcon } from 'lucide-react';")

# Conditionally render editor
editor_str = '''                      <div className="p-5">
                        <HomepageSectionEditor
                          section={section}
                          allProducts={allProducts}
                          onUpdateItems={handleUpdateItems}
                          onSave={handleSaveSection}
                        />
                      </div>'''

new_editor_str = '''                      <div className="p-5">
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
                      </div>'''

content = content.replace(editor_str, new_editor_str)

# Update handleUpdateItems wrapper logic so MidPageBannerEditor uses simple update
# We already did it inline onUpdateSection.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
