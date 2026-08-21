import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add a 30s interval for HomePage
hook = """  useEffect(() => {
    let done = 0;
    const tick = () => { done++; if (done >= 4) setLoading(false); };
    
    const fetchAll = () => {
        api.get('/categories/').then(r => setCategories(unpack(r))).catch(console.error).finally(tick);
        api.get('/offers/banners/').then(r => setBanners(unpack(r))).catch(console.error).finally(tick);
        api.get('/store/settings/').then(r => setSettings(r.data)).catch(console.error).finally(tick);
        api.get('/store/homepage-sections/').then(r => setSections(r.data.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order))).catch(console.error).finally(tick);
    };
    
    fetchAll();
    
    // Poll every 30s for Live Broadcasts & Out of Stock updates
    const intervalId = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalId);
  }, []);"""

old_hook = """  useEffect(() => {
    let done = 0;
    const tick = () => { done++; if (done >= 4) setLoading(false); };
    api.get('/categories/').then(r => setCategories(unpack(r))).catch(console.error).finally(tick);
    api.get('/offers/banners/').then(r => setBanners(unpack(r))).catch(console.error).finally(tick);
    api.get('/store/settings/').then(r => setSettings(r.data)).catch(console.error).finally(tick);
    api.get('/store/homepage-sections/').then(r => setSections(r.data.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order))).catch(console.error).finally(tick);
  }, []);"""

content = content.replace(old_hook, hook)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated HomePage")
