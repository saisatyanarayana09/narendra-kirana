import re

filepath = 'frontend/src/customer-layout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

layout_hooks_injection = """export function CustomerLayout({ children }) {
  const { cart, isCustomer, favorites, notifications } = useCart()
  const [showNotifications, setShowNotifications] = useState(false)
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [annRes, setRes] = await Promise.all([
          api.get('/store/announcements/'),
          api.get('/store/settings/')
        ]);
        setAnnouncements(annRes.data.filter(a => a.is_active).sort((a, b) => a.display_order - b.display_order));
        setSettings(setRes.data);
      } catch (err) {
        console.error('Failed to load flash announcements', err);
      }
    };
    fetchData();
  }, []);
"""

content = re.sub(
    r'export function CustomerLayout\(\{ children \}\) \{\s*const \{ cart, isCustomer, favorites, notifications \} = useCart\(\)\s*const \[showNotifications, setShowNotifications\] = useState\(false\)\s*const location = useLocation\(\);',
    layout_hooks_injection,
    content
)

banner_ui = """
 <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 text-slate-900 transition-colors duration-200">
 <WelcomeScreen />
 {announcements.length > 0 && (
    <div 
      className="w-full flex items-center overflow-hidden z-[60] relative py-1.5"
      style={{ backgroundColor: settings?.announcement_bg_color || '#ef4444', color: settings?.announcement_text_color || '#ffffff' }}
    >
      <div className="flex whitespace-nowrap animate-marquee group cursor-default text-xs font-bold tracking-wide uppercase">
        {announcements.map((ann, idx) => (
          <span key={idx} className="mx-6 flex items-center gap-3">
            {ann.text} {idx !== announcements.length - 1 && <span className="text-white/60">★</span>}
          </span>
        ))}
        {/* Duplicate for infinite seamless scroll */}
        {announcements.map((ann, idx) => (
          <span key={dup-} className="mx-6 flex items-center gap-3">
            <span className="text-white/60 mr-3">★</span>
            {ann.text} {idx !== announcements.length - 1 && <span className="text-white/60">★</span>}
          </span>
        ))}
        {/* Triple for very wide screens */}
        {announcements.map((ann, idx) => (
          <span key={	rip-} className="mx-6 flex items-center gap-3">
            <span className="text-white/60 mr-3">★</span>
            {ann.text} {idx !== announcements.length - 1 && <span className="text-white/60">★</span>}
          </span>
        ))}
      </div>
    </div>
 )}
 <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm transition-colors duration-200">"""

content = content.replace(
    ' <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 text-slate-900 transition-colors duration-200">\n <WelcomeScreen />\n <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm transition-colors duration-200">',
    banner_ui
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
