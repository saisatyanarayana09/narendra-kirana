import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace HomePage start
home_start = """export function HomePage() {
  const { isCustomer } = useCart();
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  const [sections, setSections] = useState([]);
  const [frequentProducts, setFrequentProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let done = 0;
    const tick = () => { done++; if (done >= 4) setLoading(false); };
    api.get('/categories/').then(r => setCategories(unpack(r))).catch(console.error).finally(tick);
    api.get('/offers/banners/').then(r => setBanners(unpack(r))).catch(console.error).finally(tick);
    api.get('/store/settings/').then(r => setSettings(r.data)).catch(console.error).finally(tick);
    api.get('/store/homepage-sections/').then(r => setSections(r.data.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order))).catch(console.error).finally(tick);
  }, []);

  useEffect(() => {
    if (isCustomer) {
      Promise.all([api.get('/orders/'), api.get('/products/?limit=100')])
        .then(([ordersRes, productsRes]) => {
          const myOrders = ordersRes.data.results || ordersRes.data;
          const allProds = productsRes.data.results || productsRes.data;
          const productCounts = {};
          myOrders.forEach(o => {
            o.items.forEach(i => {
              productCounts[i.product] = (productCounts[i.product] || 0) + i.quantity;
            });
          });
          const freqs = Object.entries(productCounts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 8)
            .map(([id]) => allProds.find(p => p.id == parseInt(id)))
            .filter(Boolean);
          setFrequentProducts(freqs);
        }).catch(console.error);
    }
  }, [isCustomer]);

  const sectionIcons = ['??', '??', '??', '??', '???', '??', '??', '??'];
  
  const broadcastSection = sections.find(s => s.title.startsWith('BROADCAST::'));
  const displaySections = sections.filter(s => !s.title.startsWith('BROADCAST::'));
"""

old_home_start = """export function HomePage() {
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let done = 0;
    const tick = () => { done++; if (done >= 4) setLoading(false); };
    api.get('/categories/').then(r => setCategories(unpack(r))).catch(console.error).finally(tick);
    api.get('/offers/banners/').then(r => setBanners(unpack(r))).catch(console.error).finally(tick);
    api.get('/store/settings/').then(r => setSettings(r.data)).catch(console.error).finally(tick);
    api.get('/store/homepage-sections/').then(r => setSections(r.data.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order))).catch(console.error).finally(tick);
  }, []);

  // Section icons
  const sectionIcons = ['??', '??', '??', '??', '???', '??', '??', '??'];"""

content = content.replace(old_home_start, home_start)

# Now inject broadcast banner and frequent items UI
# Before <GSAPFadeUp> <BannerCarousel banners={banners} />
ui_inject = """    <div className="w-full">
      {broadcastSection && (
        <div className="w-full bg-amber-400 text-amber-900 px-4 py-2 text-sm font-extrabold flex items-center justify-center overflow-hidden relative border-b border-amber-500 shadow-sm z-50">
           <div className="flex items-center gap-2 animate-bounce mr-2">??</div>
           <span className="whitespace-nowrap truncate">
               {broadcastSection.title.replace('BROADCAST::', '')}
           </span>
        </div>
      )}

      {frequentProducts.length > 0 && (
        <section className="bg-white border-b border-slate-100 py-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2 mb-4">
              <Zap size={20} className="text-amber-500" />
              Buy it again
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
              {frequentProducts.map(product => (
                <div key={product.id} className="snap-start flex-shrink-0 w-40 sm:w-48">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      
      <GSAPFadeUp delay={0.1}>
        <BannerCarousel banners={banners} />
      </GSAPFadeUp>"""

content = content.replace('''    <div className="w-full">
      <GSAPFadeUp>
        <BannerCarousel banners={banners} />
      </GSAPFadeUp>''', ui_inject)

# Also update the sections map to use displaySections instead of sections
content = content.replace('    {sections.map((section, index) => {', '    {displaySections.map((section, index) => {')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected UI")
