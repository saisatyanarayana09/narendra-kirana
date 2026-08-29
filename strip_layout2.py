import re
filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will replace the large block literally
start_str = ' {announcements.length > 0 && (\n    <div '
end_str = ' </div>\n    </div>\n )}\n'

if start_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str, start_idx) + len(end_str)
    content = content[:start_idx] + content[end_idx:]

api_call = """        const [annRes, setRes] = await Promise.all([
          api.get('/store/announcements/'),
          api.get('/store/settings/')
        ]);
        setAnnouncements(annRes.data.filter(a => a.is_active).sort((a, b) => a.display_order - b.display_order));
        setSettings(setRes.data);"""
api_call_new = """        const res = await api.get('/store/settings/');
        setSettings(res.data);"""
content = content.replace(api_call, api_call_new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
