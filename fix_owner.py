import os

filepath = 'S:/smart-kirana/frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add to state variables
content = content.replace('const [toggling, setToggling] = useState(false);', '''const [toggling, setToggling] = useState(false);
  const [broadcast, setBroadcast] = useState(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);''')

# Add API to fetch
api_req_find = "api.get('/products/?limit=100')"
api_req_repl = "api.get('/products/?limit=100'), api.get('/store/homepage-sections/')"
content = content.replace(api_req_find, api_req_repl)

api_res_find = "const [ordersRes, analyticsRes, settingsRes, productsRes] = await Promise.all(["
api_res_repl = "const [ordersRes, analyticsRes, settingsRes, productsRes, sectionsRes] = await Promise.all(["
content = content.replace(api_res_find, api_res_repl)

broadcast_logic = """      setProducts(productsRes.data.results || productsRes.data);
      
      const bcast = (sectionsRes.data || []).find(s => s.title.startsWith('BROADCAST::'));
      if (bcast) {
        setBroadcast(bcast);
        setBroadcastText(bcast.title.replace('BROADCAST::', ''));
      }"""
content = content.replace('      setProducts(productsRes.data.results || productsRes.data);', broadcast_logic)

# Add Broadcast handler
handler = """  const handleBroadcast = async () => {
    setBroadcasting(true);
    try {
      const active = broadcastText.trim().length > 0;
      const title = BROADCAST::;
      if (broadcast) {
        const res = await api.patch(/store/homepage-sections//, { title, is_active: active });
        setBroadcast(res.data);
      } else {
        const res = await api.post('/store/homepage-sections/', { title, display_order: -1, is_active: active });
        setBroadcast(res.data);
      }
      toast.success(active ? 'Broadcast is live!' : 'Broadcast cleared');
    } catch (err) {
      toast.error('Failed to update broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleQuickRestock"""
content = content.replace('  const handleQuickRestock', handler)

# Add Broadcast UI
# Import Megaphone
content = content.replace('AlertTriangle, Power, Plus, Gift, Tag, Activity,', 'AlertTriangle, Power, Plus, Gift, Tag, Activity, Megaphone,')

broadcast_ui = """      {/* Broadcast Banner Tool */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl flex-shrink-0">
          <Megaphone size={24} className="animate-pulse" />
        </div>
        <div className="flex-1 w-full">
          <h2 className="text-base font-extrabold text-slate-900">Live Flash Announcement</h2>
          <p className="text-xs text-slate-500 mb-2">Type a message to instantly broadcast it to all customers on the app.</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="e.g. Fresh paneer just arrived! Order now."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
            <button 
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {broadcasting ? 'Saving...' : 'Broadcast'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Center */}"""

content = content.replace('      {/* Action Center */}', broadcast_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Owner UI")
