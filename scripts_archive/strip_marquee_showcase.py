import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = re.sub(r'\s*const \[announcements, setAnnouncements\] = useState\(\[\]\);\n', '\n', content)
content = re.sub(r'\s*const \[savingAnnouncements, setSavingAnnouncements\] = useState\(false\);\n', '\n', content)

# 2. Fetch
old_fetch = """        const [secRes, prodRes, annRes, banRes, setRes] = await Promise.all([
          api.get('/store/homepage-sections/'),
          api.get('/products/'),
          api.get('/store/announcements/'),
          api.get('/offers/banners/'),
          api.get('/store/settings/')
        ]);"""
new_fetch = """        const [secRes, prodRes, banRes, setRes] = await Promise.all([
          api.get('/store/homepage-sections/'),
          api.get('/products/'),
          api.get('/offers/banners/'),
          api.get('/store/settings/')
        ]);"""
content = content.replace(old_fetch, new_fetch)
content = re.sub(r'\s*setAnnouncements\(annRes\.data\.results \|\| annRes\.data \|\| \[\]\);\n', '\n', content)

# 3. Handlers
handlers_pattern = r'  const handleAddAnnouncement = async \(\) => \{[\s\S]*?  const handleAddBanner = async \(e\) => \{'
content = re.sub(handlers_pattern, '  const handleAddBanner = async (e) => {', content)

# 4. handleDragEnd
drag_pattern = r'      if \(type === \'announcement\'\) \{[\s\S]*?      if \(type === \'banner\'\) \{'
content = re.sub(drag_pattern, '      if (type === \'banner\') {', content)

# 5. UI Block
ui_pattern = r'      \{\/\* Text Flash Announcements \*\/\}[\s\S]*?\{\/\* Promotional Banners \*\/\}'
content = re.sub(ui_pattern, '      {/* Promotional Banners */}', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
