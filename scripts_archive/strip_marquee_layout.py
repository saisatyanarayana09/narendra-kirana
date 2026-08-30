import re

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove state
content = re.sub(r'\s*const \[announcements, setAnnouncements\] = useState\(\[\]\);\n', '\n', content)

# 2. Remove fetch
old_fetch = """        const [annRes, setRes] = await Promise.all([
          api.get('/store/announcements/'),
          api.get('/store/settings/')
        ]);
        const annData = annRes.data.results || annRes.data || [];
        setAnnouncements(annData.filter(a => a.is_active).sort((a, b) => a.display_order - b.display_order));
        setSettings(setRes.data);"""

new_fetch = """        const res = await api.get('/store/settings/');
        setSettings(res.data);"""
content = content.replace(old_fetch, new_fetch)

# 3. Remove UI
pattern_ui = r' \{announcements\.length > 0 && \([\s\S]*?<\/div>\n \)\}'
content = re.sub(pattern_ui, '', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
