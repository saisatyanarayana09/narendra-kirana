import { useEffect, useState } from 'react'
import { GSAPFadeUp, GSAPZoomIn } from './components/GSAPScroll'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, Search, X, Heart, ArrowLeft } from 'lucide-react'
import api from './services/api'
import { CustomerLayout } from './customer-layout'
import { useCart } from './cart-context'
import toast from 'react-hot-toast'

const unpack = (response) => response.data.results ?? response.data

function ProductImage({ product, large = false }) {
 if (product.image) {
 return (
 <div className={`w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>
 <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-xl z-10 mix-blend-overlay"></div>
 <img src={product.image} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-110"/>
 </div>
 );
 }
 return <div className={`grid w-full place-items-center bg-slate-50 text-3xl font-bold text-slate-300 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>{product.name?.charAt(0)?.toUpperCase()}</div>
}

function SearchBox({ value, onChange }) {
 return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm"><Search className="text-slate-400"size={20} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search rice, milk, snacks..."className="min-h-12 w-full bg-transparent text-sm outline-none"/>{value && <button onClick={() => onChange('')} className="p-1 text-slate-500"><X size={18} /></button>}</div>
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
 e.preventDefault(); // Prevent navigating to detail page
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

 return <div {...props} className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary-200 flex flex-col h-full">
 {discountPercent > 0 && (
 <div className="absolute top-0 left-0 z-10 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-br-xl shadow-sm tracking-wider">
 {discountPercent}% OFF
 </div>
 )}
 
 {isCustomer && (
 <button 
 onClick={(e) => { e.preventDefault(); toggleFavorite(product.id); }} 
 className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white backdrop-blur shadow-sm transition hover:scale-110"
 >
 <Heart size={18} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500":"text-slate-300"} />
 </button>
 )}
 <Link to={`/product/${product.id}`} className="flex flex-col flex-grow">
 <div className="overflow-hidden bg-slate-50 relative">
 <ProductImage product={product} />
 </div>
 <div className="p-3 flex flex-col flex-grow bg-white">
 <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 group-hover:text-primary-700 transition-colors">{product.name}</p>
 <p className="mt-1 text-xs text-slate-500 font-medium">{product.brand && `${product.brand} · `}{product.unit}</p>
 
 {product.tags && (
 <div className="flex flex-wrap gap-1 mt-2">
 {product.tags.split(',').map((tag, i) => (
 <span key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-extrabold uppercase tracking-widest rounded">{tag.trim()}</span>
 ))}
 </div>
 )}
 
 <div className="mt-auto pt-3">
 <div className="flex items-center gap-2 mb-3">
 <span className="text-base font-black text-slate-900">₹{price}</span>
 {product.offer_price && (
 <span className="text-xs text-slate-400 line-through font-semibold">₹{product.regular_price}</span>
 )}
 </div>
 
 {product.is_in_stock ? (
 <button 
 onClick={handleAddToCart}
 disabled={adding || added || isMaxReached}
 className={`w-full rounded-lg py-2.5 min-h-[44px] sm:min-h-0 sm:py-2 text-sm font-extrabold transition-all active:scale-95 border ${added ? 'bg-green-50 text-green-700 border-green-200' : isMaxReached ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-600 hover:text-white hover:border-primary-600'} disabled:opacity-50 disabled:active:scale-100`}
 >
 {isMaxReached ? 'Max in cart' : added ? 'Added to cart' : adding ? 'Adding...' : 'Add to Cart'}
 </button>
 ) : (
 <div className="w-full text-center rounded-lg bg-slate-50 border border-slate-100 py-2 text-sm font-extrabold text-slate-400">
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
 <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-3 animate-pulse h-full flex flex-col min-h-[280px]">
 <div className="bg-slate-100 rounded-lg h-32 sm:h-36 w-full mb-3"></div>
 <div className="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
 <div className="h-3 bg-slate-100 rounded w-1/2 mb-4"></div>
 <div className="mt-auto">
 <div className="h-5 bg-slate-100 rounded w-1/3 mb-3"></div>
 <div className="h-9 bg-slate-100 rounded-lg w-full"></div>
 </div>
 </div>
 );
}

export function CategorySkeleton() {
 return (
 <div className="aspect-square sm:aspect-[4/3] rounded-2xl bg-slate-100 animate-pulse border border-slate-200 shadow-sm w-full h-full"></div>
 );
}

export function HomeCategorySkeleton() {
 return (
 <div className="min-w-32 h-20 rounded-xl bg-slate-100 animate-pulse border border-slate-100"></div>
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
 <section className="mb-6 relative rounded-2xl overflow-hidden shadow-sm group bg-slate-100 ring-1 ring-slate-900/5">
 <div 
 className="flex transition-transform duration-500 ease-out h-full"
 style={{ transform: `translateX(-${currentIndex * 100}%)` }}
 >
 {banners.map((banner) => (
 <a 
 key={banner.id} 
 href={banner.link || '#'} 
 className="w-full flex-shrink-0 block aspect-[2/1] sm:aspect-[3/1] md:aspect-[4/1]"
 >
 <img 
 src={banner.image} 
 alt={banner.title} 
 className="w-full h-full object-cover"
 />
 </a>
 ))}
 </div>
 
 {banners.length > 1 && (
 <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
 {banners.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentIndex(idx)}
 className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white hover:bg-white '}`}
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

  return <CustomerLayout><main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 overflow-hidden">
  
  <GSAPFadeUp>
    <BannerCarousel banners={banners} />
  </GSAPFadeUp>
 
  {banners.length === 0 && (
  <GSAPFadeUp delay={0.2}>
  <section className="rounded-2xl bg-slate-900 p-8 sm:p-12 text-white border border-slate-800 shadow-sm relative overflow-hidden">
  <div className="relative z-10">
  <p className="text-xs font-black uppercase tracking-[0.2em] text-primary-500 mb-3">{settings?.store_name || 'Narendra Kirana Store'}</p>
  <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl text-white tracking-tight">Everyday essentials, ready when you are.</h1>
  <p className="mt-4 max-w-xl text-base text-slate-400 font-medium leading-relaxed">Order online and collect from your local store. Quality products, straightforward pricing, and reliable service.</p>
  <Link to="/products" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 font-bold text-white transition-all hover:bg-primary-500 active:scale-95 shadow-sm">Explore Catalog <ChevronRight size={18}/></Link>
  </div>
  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full border-[20px] border-slate-800/50 pointer-events-none"></div>
  <div className="absolute bottom-0 right-20 -mb-10 w-32 h-32 rounded-full border-[10px] border-slate-800/50 pointer-events-none"></div>
  </section>
  </GSAPFadeUp>
  )}
  
  {error && <GSAPFadeUp><p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p></GSAPFadeUp>}

  {/* Categories */}
  <section className="mt-8">
  <div className="flex justify-between items-center"><h2 className="text-xl font-extrabold text-slate-900">Shop by category</h2><Link to="/products" className="text-sm font-bold text-primary-700 hover:text-primary-800 transition">See all</Link></div>
  
  {loading ? (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
      {Array.from({length: 5}).map((_, i) => <HomeCategorySkeleton key={i} />)}
    </div>
  ) : (
    <GSAPZoomIn className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar" stagger={0.05}>
      {categories.map((category) => (
        <Link 
          key={category.id} 
          to={`/products?category=${category.id}`} 
          className="w-28 sm:w-32 h-32 flex flex-col items-center justify-end p-3 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group bg-slate-50 shrink-0"
        >
        <div className="absolute inset-0">
          {category.image ? (
            <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-10">
              <span className="text-6xl font-black text-slate-900">{category.name.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black group-hover:via-black/50 transition-all duration-500" />
        </div>
        <div className="relative z-10 w-full text-center text-xs sm:text-sm leading-tight font-extrabold text-white text-shadow-sm line-clamp-2 break-words">
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
            <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
            <Link to="/products" className="text-sm font-bold text-primary-700 hover:text-primary-800 transition">View all</Link>
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
  <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
  <div className="max-w-4xl mx-auto mb-6 flex flex-col items-start gap-2">
    <button onClick={() => navigate(-1)} className="text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"><ArrowLeft size={16} /> Back</button>
    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">All Categories</h1>
  </div>
  {loading ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
 {Array.from({length: 10}).map((_, i) => <CategorySkeleton key={i} />)}
 </div>
 ) : (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
 {categories.map((category) => {
 return (
 <Link 
 key={category.id} 
 to={`/products?category=${category.id}`} 
 className="aspect-square sm:aspect-[4/3] flex flex-col items-center justify-end p-3 sm:p-4 relative rounded-2xl overflow-hidden shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group bg-slate-50 w-full"
 >
 <div className="absolute inset-0">
 {category.image ? (
 <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
 ) : (
 <div className="w-full h-full flex items-center justify-center opacity-10">
 <span className="text-6xl font-black text-slate-900">{category.name.charAt(0)}</span>
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black group-hover:via-black/50 transition-all duration-500" />
 </div>
 <div className="relative z-10 w-full text-center text-sm sm:text-base leading-tight font-extrabold text-white text-shadow-sm line-clamp-2 break-words">
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
  useEffect(() => { const timer = setTimeout(() => { const params = {}; if (query) params.search = query; if (category) params.category = category; Promise.all([api.get('/products/', { params }), api.get('/categories/')]).then(([productsResult, categoriesResult]) => { setProducts(unpack(productsResult)); setCategories(unpack(categoriesResult)); setError('') }).catch(() => setError('Could not load products.')).finally(() => setLoading(false)) }, 300); return () => clearTimeout(timer) }, [query, category])
  function updateSearch(value) { const next = new URLSearchParams(searchParams); if (value) next.set('search', value); else next.delete('search'); setSearchParams(next) }
  
  const activeCategoryName = category && categories.length ? categories.find(c => String(c.id) === category)?.name : 'All products';
  
  return (
  <CustomerLayout>
    <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <div className="sticky top-[60px] sm:top-[68px] z-20 -mx-4 px-4 sm:mx-0 sm:px-0 bg-slate-50 py-3 mb-4 border-b border-slate-200/60 shadow-sm sm:shadow-none sm:border-none sm:bg-transparent sm:py-0">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar items-center">
          <Link to="/"className="flex shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50 transition w-9 h-9 mr-1" aria-label="Back to home"><ArrowLeft size={18} /></Link>
          <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete('category'); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 ${!category ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50 transition'}`}>All</button>
          {categories.map((item) => <button key={item.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set('category', item.id); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 ${category === String(item.id) ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50 transition'}`}>{item.name}</button>)}
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
 if (error) return <CustomerLayout><main className="mx-auto max-w-3xl p-6"><Link to="/products"className="font-bold text-primary-700">Back to products</Link><p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p></main></CustomerLayout>
 if (!product) return <CustomerLayout><main className="mx-auto max-w-3xl p-6 text-slate-500">Loading product...</main></CustomerLayout>
 const price = product.offer_price || product.regular_price
 const isFav = favorites?.find(f => f.product === product.id);
 const regPrice = Number(product.regular_price);
 const offPrice = Number(product.offer_price);
 const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;
 
 const cartItem = cart?.items?.find(item => item.product === product.id);
 const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;
 const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;

 return <CustomerLayout><main className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer"><ArrowLeft size={16} /> Back</button><article className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 relative flex flex-col md:flex-row">
 {discountPercent > 0 && (
 <div className="absolute top-0 left-0 z-10 bg-emerald-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-br-2xl shadow-sm tracking-wider">
 {discountPercent}% OFF
 </div>
 )}
 <div className="w-full md:w-1/2 md:min-h-[400px]">
 <ProductImage product={product} large />
 </div>
 <div className="w-full md:w-1/2 p-6 sm:p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center">
 <div className="flex justify-between items-start"><p className="text-sm font-bold text-primary-700">{product.category_name || 'Grocery'}</p>{isCustomer && <button onClick={() => toggleFavorite(product.id)} className="p-2 -mr-2 rounded-full hover:bg-slate-50 transition"><Heart size={24} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500":"text-slate-300"} /></button>}</div><h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900">{product.name}</h1><p className="mt-1 text-sm font-medium text-slate-500">{product.brand && `${product.brand} · `}{product.unit}</p>
 {product.tags && (
 <div className="flex flex-wrap gap-2 mt-3">
 {product.tags.split(',').map((tag, i) => (
 <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>
 ))}
 </div>
 )}
 <div className="mt-6 flex items-center gap-3">
 <p className="text-4xl font-black text-slate-900">₹{price}</p>
 {product.offer_price && (
 <p className="text-lg font-bold text-slate-400 line-through mt-1">₹{product.regular_price}</p>
 )}
 </div>
 <button onClick={addToCart} disabled={!product.is_in_stock || adding || added || isMaxReached} className={`mt-8 hidden md:block min-h-14 w-full rounded-xl px-4 py-3 text-lg font-extrabold transition-all shadow-sm active:scale-[0.98] ${added ? 'bg-green-600 text-white' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{product.is_in_stock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : 'Add to cart') : 'Out of stock'}</button>
 <div className="mt-8 pt-6 border-t border-slate-100 mb-8 md:mb-0">
 <h3 className="text-sm font-extrabold text-slate-900 mb-2">Product Description</h3>
 <p className="text-sm leading-relaxed text-slate-600 pb-12 md:pb-0">{product.description || 'Fresh, quality essentials from your local store.'}</p>
 </div>
 </div></article>

 {/* Mobile Sticky Add to Cart */}
 <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 bg-white border-t border-slate-200 p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:hidden">
   <button onClick={addToCart} disabled={!product.is_in_stock || adding || added || isMaxReached} className={`w-full min-h-[44px] rounded-xl px-4 py-2.5 text-base font-extrabold transition-all shadow-sm active:scale-95 ${added ? 'bg-green-600 text-white' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{product.is_in_stock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : `Add to cart - ₹${price}`) : 'Out of stock'}</button>
 </div>

 </main></CustomerLayout>
}
