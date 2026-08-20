import { optimizeImage } from './utils/image';
import { useEffect, useState } from 'react'
import { GSAPFadeUp, GSAPZoomIn } from './components/GSAPScroll'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, Search, X, Heart, ArrowLeft, ShoppingCart, Sparkles, Zap, Star } from 'lucide-react'
import api from './services/api'
import { CustomerLayout } from './customer-layout'
import { useCart } from './cart-context'
import toast from 'react-hot-toast'

const unpack = (response) => response.data.results ?? response.data

// Vibrant color palette for category cards
const CATEGORY_COLORS = [
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-yellow-600',
  'from-blue-500 to-indigo-600',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-pink-500',
];

function ProductImage({ product, large = false }) {
 if (product.image) {
 return (
 <div className={`w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>
 <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-xl z-10 mix-blend-overlay"></div>
 <img loading='lazy' decoding='async' src={optimizeImage(product.image)} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-110"/>
 </div>
 );
 }
 return <div className={`grid w-full place-items-center bg-gradient-to-br from-emerald-50 to-teal-50 text-3xl font-bold text-emerald-300 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>{product.name?.charAt(0)?.toUpperCase()}</div>
}

function SearchBox({ value, onChange }) {
 return <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100 transition-all duration-300"><Search className="text-slate-400 group-focus-within:text-emerald-500 transition-colors"size={20} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search rice, milk, snacks..."className="min-h-12 w-full bg-transparent text-sm outline-none font-medium"/>{value && <button onClick={() => onChange('')} className="p-1 text-slate-500 hover:text-red-500 transition-colors"><X size={18} /></button>}</div>
}

export function ProductCard({ product, ...props }) {
  const { favorites, toggleFavorite, isCustomer, add, cart } = useCart();
 const navigate = useNavigate();
 const [adding, setAdding] = useState(false);
 const [added, setAdded] = useState(false);
 const price = product.offer_price || product.regular_price
 const isFav = favorites?.find(f => f.product === product.id);
 
 const cartItem = cart?.items?.find(item => item.product === product.id);
 const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;
 const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;
 
 const regPrice = Number(product.regular_price);
 const offPrice = Number(product.offer_price);
 const discountPercent = product.offer_price && regPrice > offPrice 
 ? Math.round(((regPrice - offPrice) / regPrice) * 100) 
 : 0;

 const handleAddToCart = async (e) => {
 e.preventDefault();
 if (!isCustomer) { navigate('/login'); return; }
 setAdding(true);
 try {
 await add(product);
 setAdded(true);
 setTimeout(() => setAdded(false), 3000);
 } catch (err) {
 toast.error(err.response?.data?.detail || 'Failed to add to cart.');
 } finally {
 setAdding(false);
 }
 };

 return <div {...props} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-emerald-200 hover:ring-2 hover:ring-emerald-100 flex flex-col h-full">
 {discountPercent > 0 && (
 <div className="absolute top-0 left-0 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-br-xl rounded-tl-xl shadow-lg tracking-wider flex items-center gap-1">
 <Zap size={10} fill="currentColor" />
 {discountPercent}% OFF
 </div>
 )}
 
 {isCustomer && (
 <button 
 onClick={(e) => { e.preventDefault(); toggleFavorite(product.id); }} 
 className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur shadow-md transition-all hover:scale-125 hover:bg-white active:scale-95"
 >
 <Heart size={18} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500 drop-shadow-sm":"text-slate-300"} />
 </button>
 )}
 <Link to={`/product/${product.id}`} className="flex flex-col flex-grow">
 <div className="overflow-hidden bg-slate-50 relative rounded-t-2xl">
 <ProductImage product={product} />
 </div>
 <div className="p-3 flex flex-col flex-grow bg-white">
 <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 group-hover:text-emerald-700 transition-colors">{product.name}</p>
 <p className="mt-1 text-xs text-slate-500 font-medium">{product.brand && `${product.brand} · `}{product.unit}</p>
 
 {product.tags && (
 <div className="flex flex-wrap gap-1 mt-2">
 {product.tags.split(',').map((tag, i) => (
 <span key={i} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[9px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>
 ))}
 </div>
 )}
 
 <div className="mt-auto pt-3">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-lg font-black text-emerald-700">₹{price}</span>
 {product.offer_price && (
 <span className="text-xs text-slate-400 line-through font-semibold">₹{product.regular_price}</span>
 )}
 </div>
 
 {product.is_in_stock ? (
 <button 
 onClick={handleAddToCart}
 disabled={adding || added || isMaxReached}
 className={`w-full rounded-xl py-2.5 min-h-[44px] sm:min-h-0 sm:py-2 text-sm font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${added ? 'bg-green-500 text-white shadow-md' : isMaxReached ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg shadow-emerald-200 shadow-md'} disabled:opacity-60 disabled:active:scale-100`}
 >
 {isMaxReached ? 'Max in cart' : added ? '✓ Added!' : adding ? 'Adding...' : <><ShoppingCart size={14} /> Add to Cart</>}
 </button>
 ) : (
 <div className="w-full text-center rounded-xl bg-slate-50 border border-slate-100 py-2 text-sm font-extrabold text-slate-400">
 Out of stock
 </div>
 )}
 </div>
 </div>
 </Link>
 </div>
}

export function ProductSkeleton() {
 return (
 <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-3 animate-pulse h-full flex flex-col min-h-[280px]">
 <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl h-32 sm:h-36 w-full mb-3"></div>
 <div className="h-4 bg-slate-100 rounded-lg w-3/4 mb-2"></div>
 <div className="h-3 bg-slate-100 rounded-lg w-1/2 mb-4"></div>
 <div className="mt-auto">
 <div className="h-5 bg-slate-100 rounded-lg w-1/3 mb-3"></div>
 <div className="h-10 bg-emerald-50 rounded-xl w-full"></div>
 </div>
 </div>
 );
}

export function CategorySkeleton() {
 return (
 <div className="aspect-square sm:aspect-[4/3] rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse border border-slate-200 shadow-sm w-full h-full"></div>
 );
}

export function HomeCategorySkeleton() {
 return (
 <div className="w-24 h-24 sm:w-32 sm:h-24 md:w-40 md:h-[120px] shrink-0 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 animate-pulse border border-slate-100"></div>
 );
}

function BannerCarousel({ banners }) {
 const [currentIndex, setCurrentIndex] = useState(0);

 useEffect(() => {
 if (banners.length <= 1) return;
 const timer = setInterval(() => {
 setCurrentIndex(prev => (prev + 1) % banners.length);
 }, 4000);
 return () => clearInterval(timer);
 }, [banners.length]);

 if (!banners.length) return null;

 return (
 <section className="relative overflow-hidden group bg-slate-100 w-full mb-2 sm:mb-6 shadow-sm">
 <div 
 className="flex transition-transform duration-500 ease-out h-full"
 style={{ transform: `translateX(-${currentIndex * 100}%)` }}
 >
 {banners.map((banner) => (
 <a 
 key={banner.id} 
 href={banner.link || '#'} 
 className="w-full flex-shrink-0 block aspect-[16/7] sm:aspect-[21/9] md:aspect-[4/1] max-h-[180px] sm:max-h-[200px] md:max-h-[240px]"
 >
 <img loading='lazy' decoding='async' 
 src={optimizeImage(banner.image)} 
 alt={banner.title} 
 className="w-full h-full object-cover"
 />
 </a>
 ))}
 </div>
 
 {banners.length > 1 && (
 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
 {banners.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentIndex(idx)}
 className={`h-2 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-8 bg-white shadow-lg' : 'w-2 bg-white/60 hover:bg-white'}`}
 aria-label={`Go to slide ${idx + 1}`}
 />
 ))}
 </div>
 )}
 </section>
 );
}

export function HomePage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/products/'),
      api.get('/categories/'),
      api.get('/offers/banners/'),
      api.get('/store/settings/'),
      api.get('/store/homepage-sections/'),
    ]).then(([productsRes, catsRes, bannersRes, settingsRes, sectionsRes]) => {
      setProducts(unpack(productsRes));
      setCategories(unpack(catsRes));
      setBanners(unpack(bannersRes));
      setSettings(settingsRes.data);
      setSections(sectionsRes.data.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order));
    }).catch(() => setError('The catalog is temporarily unavailable.')).finally(() => setLoading(false));
  }, []);

  // Map curated section items back to full products (to keep ProductCard compatible)
  const resolveProducts = (items) => {
    return items
      .filter(item => item.is_in_stock)
      .map(item => products.find(p => p.id === item.id) || item);
  };

  // Section icons
  const sectionIcons = ['🔥', '⭐', '🆕', '💎', '🎯', '🌟', '✨', '🏷️'];

  return <CustomerLayout>
  <div className="w-full">
    <GSAPFadeUp>
      <BannerCarousel banners={banners} />
    </GSAPFadeUp>
   
    {banners.length === 0 && (
    <GSAPFadeUp delay={0.2}>
    <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-blue-700 text-white shadow-xl relative overflow-hidden w-full mb-6 max-h-[200px] md:max-h-[240px] flex flex-col justify-center">
    {/* Animated decorative shapes */}
    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-48 h-48 rounded-full bg-white/10 animate-pulse"></div>
    <div className="absolute bottom-0 right-20 -mb-8 w-32 h-32 rounded-full bg-white/10 animate-pulse" style={{animationDelay: '1s'}}></div>
    <div className="absolute top-1/2 left-10 w-16 h-16 rounded-full bg-yellow-400/20 animate-bounce" style={{animationDuration: '3s'}}></div>
    <div className="absolute top-4 right-32 text-4xl opacity-20 animate-bounce" style={{animationDuration: '2.5s'}}>🛒</div>
    <div className="absolute bottom-6 right-8 text-3xl opacity-20 animate-bounce" style={{animationDuration: '3.5s'}}>🥬</div>
    
    <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-12">
    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
      <Sparkles size={12} className="text-yellow-300" />
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white">{settings?.store_name || 'Narendra Kirana Store'}</p>
    </div>
    <h1 className="max-w-2xl text-2xl font-extrabold leading-tight sm:text-4xl text-white tracking-tight drop-shadow-sm">Everyday essentials, <span className="text-yellow-300">ready when you are.</span></h1>
    <p className="mt-2 max-w-xl text-sm text-emerald-100 font-medium leading-relaxed hidden sm:block">Order online and collect from your local store. Quality products, straightforward pricing, and reliable service.</p>
    <Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-emerald-700 transition-all hover:bg-yellow-300 hover:text-emerald-900 active:scale-95 shadow-md hover:shadow-lg group">
      Explore Catalog <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
    </Link>
    </div>
    </section>
    </GSAPFadeUp>
    )}
  </div>

  <main className="mx-auto w-full max-w-screen-2xl px-4 pb-5 sm:px-6 sm:pb-8 lg:px-12 overflow-hidden">
  
  {error && <GSAPFadeUp><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 mb-6">{error}</p></GSAPFadeUp>}

  {/* Categories */}
  <section className="mt-4">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-2">
      <span className="text-2xl">🏪</span>
      <h2 className="text-xl font-extrabold text-slate-900">Shop by Category</h2>
    </div>
    <Link to="/products" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1">See all <ChevronRight size={14} /></Link>
  </div>
  
  {loading ? (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
      {Array.from({length: 5}).map((_, i) => <HomeCategorySkeleton key={i} />)}
    </div>
  ) : (
    <GSAPZoomIn className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar" stagger={0.05}>
      {categories.map((category, index) => (
        <Link 
          key={category.id} 
          to={`/products?category=${category.id}`} 
          className="w-24 h-24 sm:w-32 sm:h-24 md:w-40 md:h-[120px] flex flex-col items-center justify-end p-2 sm:p-3 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:scale-105 group shrink-0"
        >
        <div className="absolute inset-0">
          {category.image ? (
            <img loading='lazy' decoding='async' src={optimizeImage(category.image)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}></div>
          )}
          <div className={`absolute inset-0 ${category.image ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent' : 'bg-black/20'} group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500`} />
        </div>
        <div className="relative z-10 w-full text-center text-xs sm:text-sm leading-tight font-extrabold text-white drop-shadow-md line-clamp-2 break-words">
          {category.name}
        </div>
      </Link>
      ))}
    </GSAPZoomIn>
  )}
  </section>
  
  {/* Dynamic Homepage Sections */}
  {sections.map((section, index) => {
    const sectionProducts = resolveProducts(section.items || []);
    if (sectionProducts.length === 0 && !loading) return null;

    return (
      <section key={section.id} className={index === 0 ? "mt-8" : "mt-8 pt-8 border-t border-slate-100"}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">{sectionIcons[index % sectionIcons.length]}</span>
              <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
            </div>
            <Link to="/products" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1">View all <ChevronRight size={14} /></Link>
          </div>
          {loading ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({length: 6}).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : (
            <GSAPFadeUp className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" stagger={0.05}>
              {sectionProducts.map((product) => <ProductCard key={product.id} product={product} />)}
            </GSAPFadeUp>
          )}
      </section>
    );
  })}
  
  </main></CustomerLayout>
}

export function CategoriesPage() {
 const navigate = useNavigate();
 const [categories, setCategories] = useState([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 api.get('/categories/').then(res => {
 setCategories(unpack(res));
 }).catch(console.error).finally(() => setLoading(false));
 }, []);

 return (
 <CustomerLayout>
  <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-12">
  <div className="w-full mb-6 flex flex-col items-start gap-2">
    <button onClick={() => navigate(-1)} className="text-sm font-bold text-emerald-700 hover:underline bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"><ArrowLeft size={16} /> Back</button>
    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">All Categories</h1>
  </div>
  {loading ? (
 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 w-full">
 {Array.from({length: 12}).map((_, i) => <CategorySkeleton key={i} />)}
 </div>
 ) : (
 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 w-full">
 {categories.map((category, index) => {
 return (
 <Link 
 key={category.id} 
 to={`/products?category=${category.id}`} 
 className="aspect-square sm:aspect-[4/3] flex flex-col items-center justify-end p-2 sm:p-3 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:scale-105 group bg-slate-50 w-full"
 >
 <div className="absolute inset-0">
 {category.image ? (
 <img loading='lazy' decoding='async' src={optimizeImage(category.image)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
 ) : (
 <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_COLORS[index % CATEGORY_COLORS.length]}`}>
   <div className="w-full h-full flex items-center justify-center opacity-30">
     <span className="text-6xl font-black text-white">{category.name.charAt(0)}</span>
   </div>
 </div>
 )}
 <div className={`absolute inset-0 ${category.image ? 'bg-gradient-to-t from-black/80 via-black/30 to-transparent' : ''} group-hover:from-black/90 group-hover:via-black/40 transition-all duration-500`} />
 </div>
 <div className="relative z-10 w-full text-center text-sm sm:text-base leading-tight font-extrabold text-white drop-shadow-lg line-clamp-2 break-words">
 {category.name}
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </main>
 </CustomerLayout>
 );
}

 export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams(); const [products, setProducts] = useState([]); const [categories, setCategories] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const query = searchParams.get('search') || ''; const category = searchParams.get('category') || ''
    useEffect(() => {
      api.get('/categories/').then(res => setCategories(unpack(res))).catch(console.error);
    }, []);

    useEffect(() => {
      let loadingTimeout = setTimeout(() => setLoading(true), 50);
      const params = {};
      if (query) params.search = query;
      if (category) params.category = category;
      
      const timer = setTimeout(() => {
        api.get('/products/', { params })
           .then(res => { clearTimeout(loadingTimeout); setProducts(unpack(res)); setError(''); })
           .catch(() => setError('Could not load products.'))
           .finally(() => { clearTimeout(loadingTimeout); setLoading(false); });
      }, query ? 300 : 0);

      return () => { clearTimeout(timer); clearTimeout(loadingTimeout); };
    }, [query, category]);
  function updateSearch(value) { const next = new URLSearchParams(searchParams); if (value) next.set('search', value); else next.delete('search'); setSearchParams(next) }
  
  const activeCategoryName = category && categories.length ? categories.find(c => String(c.id) === category)?.name : 'All products';
  
  return (
  <CustomerLayout>
    <main className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-12">
      <div className="sticky top-[60px] sm:top-[68px] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-slate-50 py-3 mb-4 border-b border-slate-200/60 shadow-sm sm:shadow-none sm:border-none sm:bg-transparent sm:py-0">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar items-center">
          <Link to="/"className="flex shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50 transition w-9 h-9 mr-1" aria-label="Back to home"><ArrowLeft size={18} /></Link>
          <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete('category'); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 transition-all ${!category ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50'}`}>All</button>
          {categories.map((item) => <button key={item.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set('category', item.id); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 transition-all ${category === String(item.id) ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50'}`}>{item.name}</button>)}
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{activeCategoryName}</h1>
        {!loading && <p className="text-sm font-medium text-slate-500">{products.length} products</p>}
      </div>
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {loading ? Array.from({length: 8}).map((_, i) => <ProductSkeleton key={i} />) : products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </main>
  </CustomerLayout>
  )
}

 export function ProductDetailPage() {
 const { id } = useParams(); const navigate = useNavigate(); const { add, isCustomer, favorites, toggleFavorite, cart } = useCart(); const [product, setProduct] = useState(null); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [added, setAdded] = useState(false)
 useEffect(() => { window.scrollTo(0, 0); api.get(`/products/${id}/`).then((response) => setProduct(response.data)).catch(() => setError('This product is unavailable or no longer active.')) }, [id])
 async function addToCart() { if (!isCustomer) { navigate('/login'); return } setAdding(true); try { await add(product); setAdded(true); toast.success('Added to cart'); setTimeout(() => setAdded(false), 3000); } catch (requestError) { toast.error(requestError.response?.data?.detail || 'Could not add this item.') } finally { setAdding(false) } }
 if (error) return <CustomerLayout><main className="mx-auto max-w-3xl p-6"><Link to="/products"className="font-bold text-emerald-700">Back to products</Link><p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p></main></CustomerLayout>
 if (!product) return <CustomerLayout><main className="mx-auto max-w-3xl p-6 text-slate-500">Loading product...</main></CustomerLayout>
 const price = product.offer_price || product.regular_price
 const isFav = favorites?.find(f => f.product === product.id);
 const regPrice = Number(product.regular_price);
 const offPrice = Number(product.offer_price);
 const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;
 
 const cartItem = cart?.items?.find(item => item.product === product.id);
 const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;
 const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;

 return <CustomerLayout><main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-12"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline bg-transparent border-none cursor-pointer"><ArrowLeft size={16} /> Back</button><article className="mt-5 overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-200 relative flex flex-col md:flex-row">
 {discountPercent > 0 && (
 <div className="absolute top-0 left-0 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-extrabold px-4 py-2 rounded-br-2xl shadow-lg tracking-wider flex items-center gap-1.5">
 <Zap size={12} fill="currentColor" />
 {discountPercent}% OFF
 </div>
 )}
 <div className="w-full md:w-1/2 md:min-h-[400px]">
 <ProductImage product={product} large />
 </div>
 <div className="w-full md:w-1/2 p-6 sm:p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center">
 <div className="flex justify-between items-start"><p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{product.category_name || 'Grocery'}</p>{isCustomer && <button onClick={() => toggleFavorite(product.id)} className="p-2 -mr-2 rounded-full hover:bg-rose-50 transition"><Heart size={24} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500":"text-slate-300"} /></button>}</div><h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">{product.name}</h1><p className="mt-1 text-sm font-medium text-slate-500">{product.brand && `${product.brand} · `}{product.unit}</p>
 {product.tags && (
 <div className="flex flex-wrap gap-2 mt-3">
 {product.tags.split(',').map((tag, i) => (
 <span key={i} className="px-2 py-1 bg-violet-50 text-violet-700 text-[10px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>
 ))}
 </div>
 )}
 <div className="mt-6 flex items-center gap-3">
 <p className="text-4xl font-black text-emerald-700">₹{price}</p>
 {product.offer_price && (
 <p className="text-lg font-bold text-slate-400 line-through mt-1">₹{product.regular_price}</p>
 )}
 </div>
 <button onClick={addToCart} disabled={!product.is_in_stock || adding || added || isMaxReached} className={`mt-8 hidden md:flex items-center justify-center gap-2 min-h-14 w-full rounded-xl px-4 py-3 text-lg font-extrabold transition-all active:scale-[0.98] ${added ? 'bg-green-500 text-white shadow-md' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl shadow-lg shadow-emerald-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{product.is_in_stock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : <><ShoppingCart size={20} /> Add to Cart</>) : 'Out of stock'}</button>
 <div className="mt-8 pt-6 border-t border-slate-100 mb-8 md:mb-0">
 <h3 className="text-sm font-extrabold text-slate-900 mb-2">Product Description</h3>
 <p className="text-sm leading-relaxed text-slate-600 pb-12 md:pb-0">{product.description || 'Fresh, quality essentials from your local store.'}</p>
 </div>
 </div></article>

 {/* Mobile Sticky Add to Cart */}
 <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 bg-white border-t border-slate-200 p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:hidden">
   <button onClick={addToCart} disabled={!product.is_in_stock || adding || added || isMaxReached} className={`w-full min-h-[44px] rounded-xl px-4 py-2.5 text-base font-extrabold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${added ? 'bg-green-500 text-white' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{product.is_in_stock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : <><ShoppingCart size={16} /> Add to Cart · ₹{price}</>) : 'Out of stock'}</button>
 </div>

 </main></CustomerLayout>
}
