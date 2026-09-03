import { optimizeImage } from './utils/image';

import { useEffect, useState, useMemo } from 'react'

import { GSAPFadeUp, GSAPZoomIn } from './components/GSAPScroll'

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { ChevronRight, ChevronLeft, Search, X, Heart, ArrowLeft, ShoppingCart, Sparkles, Zap, Star, Megaphone } from 'lucide-react'

import api, { readCacheSync } from './services/api'

import { CustomerLayout } from './customer-layout'

import { useCart } from './cart-context'

import toast from 'react-hot-toast'



const unpack = (response) => response.data.results ?? response.data



// Vibrant color palette for category cards

const CATEGORY_COLORS = [

  'from-emerald-700 to-emerald-800',

  'from-emerald-800 to-emerald-900',

  'from-emerald-600 to-emerald-700',

  'from-cyan-500 to-blue-500',

  'from-fuchsia-500 to-pink-500',

];



function ProductImage({ product, large = false, priority = false }) {
  const [activeImage, setActiveImage] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const images = [];
  if (product.image) images.push(product.image);
  if (product.gallery_images) {
      product.gallery_images.forEach(g => {
         if (g.image && g.image !== product.image) images.push(g.image);
      });
  }

  // Fallback for pumpkin seeds if image is dummyimage or broken
  if (images.length === 0 || images[0]?.includes('dummyimage.com')) {
    if (product.name?.toLowerCase().includes('pumpkin')) {
      images[0] = '/media/products/pumpkin_seeds.jpg';
    }
  }

  if (images.length > 0) {
    if (large && images.length > 1) {
       return (
          <div className="flex flex-col h-full w-full">
            <div className="w-full flex-1 flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 h-72 sm:h-80 md:h-96">
              <img 
                src={optimizeImage(images[activeImage], 600)} 
                onError={(e) => {
                  if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                    e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
                  }
                }}
                className="w-full h-full object-cover mix-blend-multiply" 
              />
            </div>
            <div className="flex gap-3 p-3 overflow-x-auto bg-slate-50 border-t border-slate-100">
               {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-sm transition-all ${activeImage === i ? 'ring-2 ring-indigo-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                     <img 
                       src={optimizeImage(img, 100)} 
                       onError={(e) => {
                         if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                           e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
                         }
                       }}
                       className="w-full h-full object-cover" 
                     />
                  </button>
               ))}
            </div>
          </div>
       );
    }
    
    return (
       <div className={`w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>
           <div className={`absolute inset-0 bg-slate-100 transition-opacity duration-300 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100 animate-pulse'}`} />
           <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 rounded-t-xl z-10 mix-blend-overlay"></div>
           <img 
             loading={priority ? 'eager' : 'lazy'}
             fetchPriority={priority ? 'high' : undefined}
             decoding='async' 
             src={optimizeImage(images[0], large ? 600 : 300)} 
             alt={product.name} 
             onLoad={() => setImageLoaded(true)}
             onError={(e) => {
               setImageLoaded(true);
               if (product.name?.toLowerCase().includes('pumpkin') && !e.currentTarget.src.includes('pumpkin_seeds.jpg')) {
                 e.currentTarget.src = '/media/products/pumpkin_seeds.jpg';
               }
             }}
             className={`w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover/card:scale-110 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
           />
       </div>
    );
  }

  return <div className={`grid w-full place-items-center bg-slate-100 text-3xl font-bold text-slate-300 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>{product.name?.charAt(0)?.toUpperCase()}</div>
}



function SearchBox({ value, onChange }) {

 return <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-4 shadow-sm focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100 transition-all duration-300"><Search className="text-slate-400 group-focus-within:text-slate-400 transition-colors"size={20} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search rice, milk, snacks..."className="min-h-12 w-full bg-transparent text-sm outline-none font-medium"/>{value && <button onClick={() => onChange('')} className="p-1 text-slate-500 hover:text-red-500 transition-colors"><X size={18} /></button>}</div>

}



export function ProductCard({ product, priority = false, ...props }) {

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

 const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;



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



 return <div {...props} className="group/card relative overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-slate-200 hover:ring-2 hover:ring-emerald-100 flex flex-col h-full">

 {discountPercent > 0 && (

 <div className="absolute top-0 left-0 z-10 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-br-xl rounded-tl-xl shadow-lg tracking-wider flex items-center gap-1">

 <Zap size={10} fill="currentColor" />

 {discountPercent}% OFF

 </div>

 )}

 

 {isCustomer && (

 <button 

 onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }} 

 className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/90 backdrop-blur shadow-md transition-all hover:scale-125 hover:bg-white active:scale-95"

 >

 <Heart size={18} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500 drop-shadow-sm":"text-slate-300"} />

 </button>

 )}

 <Link to={`/product/${product.id}`} className="flex flex-col flex-grow">

 <div className={`overflow-hidden bg-slate-50 relative rounded-t-2xl ${isOutOfStock ? "grayscale opacity-80" : ""}`}>

    {isOutOfStock && (

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl tracking-widest whitespace-nowrap border border-white/20">

         OUT OF STOCK

      </div>

   )}

   <ProductImage product={product} priority={priority} />

 </div>

 <div className="p-3 flex flex-col flex-grow bg-white">

 <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-800 group-hover/card:text-slate-600 transition-colors">{product.name}</p>

 <p className="mt-1 text-xs text-slate-500 font-medium">{product.brand && `${product.brand} · `}{product.unit}</p>

 

 {product.tags && (

 <div className="flex flex-wrap gap-1 mt-2">

 {product.tags.split(',').map((tag, i) => (

 <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 text-[9px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>

 ))}

 </div>

 )}

 

 <div className="mt-auto pt-3">

 <div className="flex items-center gap-2 mb-3">

 <span className="text-lg font-black text-slate-600">₹{price}</span>

 {product.offer_price && (

 <span className="text-xs text-slate-400 line-through font-semibold">₹{product.regular_price}</span>

 )}

 </div>

 

 {(!isOutOfStock) ? (

 <button 

 onClick={handleAddToCart}

 disabled={adding || added || isMaxReached}

 className={`w-full rounded-xl py-2.5 min-h-[44px] sm:min-h-0 sm:py-2 text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${added ? 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm' : isMaxReached ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg shadow-red-200 shadow-md'} disabled:opacity-60 disabled:active:scale-100`}

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

 <div className="h-10 bg-slate-50 rounded-xl w-full"></div>

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

 src={optimizeImage(banner.image, 1200)} 

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

    const initCats = readCacheSync('/categories/');
  const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);

  const initBanners = readCacheSync('/offers/banners/');
  const [banners, setBanners] = useState(initBanners ? (initBanners.results || initBanners) : []);

  const initSettings = readCacheSync('/store/settings/');
  const [settings, setSettings] = useState(initSettings || null);

  const initSectionsRaw = readCacheSync('/store/homepage-sections/');
  const [sections, setSections] = useState(() => {
    if (!initSectionsRaw) return [];
    const d = initSectionsRaw.results || initSectionsRaw || [];
    const mapped = d.map(sec => ({
      ...sec,
      items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
    }));
    return mapped.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order);
  });

  const [loading, setLoading] = useState(() => !initCats || !initBanners || !initSectionsRaw);
  const [error, setError] = useState('');



  useEffect(() => {

    const fetchAll = async () => {
      try {
        const [catsRes, bannersRes, settingsRes, sectionsRes] = await Promise.allSettled([
          api.get('/categories/'),
          api.get('/offers/banners/'),
          api.get('/store/settings/'),
          api.get('/store/homepage-sections/')
        ]);

        if (catsRes.status === 'fulfilled') setCategories(unpack(catsRes.value));
        if (bannersRes.status === 'fulfilled') setBanners(unpack(bannersRes.value));
        if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value.data);
        if (sectionsRes.status === 'fulfilled') {
          const d = sectionsRes.value.data.results || sectionsRes.value.data || [];
          const mapped = d.map(sec => ({
            ...sec,
            items: (sec.section_products || []).sort((a, b) => a.position - b.position).map(sp => sp.product_details)
          }));
          setSections(mapped.filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order));
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };

    

    fetchAll();

    

    // Poll every 30s for Live Broadcasts & Out of Stock updates
    const intervalId = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 30000);

    return () => clearInterval(intervalId);

  }, []);



  // Helper to strip any emojis from titles globally
  const stripEmojis = (str) => str ? str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim() : '';



  return <CustomerLayout>

  <div className="w-full">

    <GSAPFadeUp>

      <BannerCarousel banners={banners} />

    </GSAPFadeUp>

   

    {banners.length === 0 && (

    <GSAPFadeUp delay={0.2}>

    <section className="bg-emerald-800 text-white shadow-xl relative overflow-hidden w-full mb-6 max-h-[200px] md:max-h-[240px] flex flex-col justify-center">

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

    <Link to="/products" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-slate-800 transition-all hover:bg-slate-100 hover:text-slate-800 active:scale-95 shadow-md hover:shadow-lg group">

      Explore Catalog <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>

    </Link>

    </div>

    </section>

    </GSAPFadeUp>

    )}

  </div>



  <main className="mx-auto w-full max-w-screen-2xl px-4 pb-5 sm:px-6 sm:pb-8 lg:px-12">

  

  {error && <GSAPFadeUp><p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-100 mb-6">{error}</p></GSAPFadeUp>}



  {/* Categories */}

  <section className="mt-1 relative">

  <div className="flex justify-between items-center py-2">

    <div className="flex items-center gap-2">

      <h2 className="text-lg font-bold text-slate-900">Explore Aisles</h2>

    </div>

    <Link to="/products" className="text-xs font-bold text-slate-500 hover:text-slate-600 transition flex items-center gap-1">See all <ChevronRight size={14} /></Link>

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

            <img loading='lazy' decoding='async' src={optimizeImage(category.image, 300)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>

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

  

  {/* Dynamic Homepage Sections (Horizontal Scrollable Carousel) */}
  {sections.map((section, index) => {
    const sectionProducts = (section.items || []).filter(item => item && item.is_in_stock);

    if (sectionProducts.length === 0 && !loading) return null;

    return (
      <section key={section.id} className={index === 0 ? "mt-4 relative" : "mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 relative"}>
          <div className="sticky top-[56px] sm:top-[68px] z-20 bg-slate-50/95 backdrop-blur-sm py-2 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{stripEmojis(section.title)}</h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {sectionProducts.length}
              </span>
            </div>

            <Link to="/products" className="text-xs font-bold text-slate-500 hover:text-slate-600 transition flex items-center gap-1">
              View all <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="w-[160px] sm:w-[190px] md:w-[210px] shrink-0">
                  <ProductSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="relative group/carousel mt-3">
              {/* Left Scroll Arrow (Desktop) */}
              {sectionProducts.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`carousel-${section.id}`);
                    if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
                  }}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 z-10 hidden sm:flex"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Horizontal Scroll Row (Scroll Left / Right) */}
              <div 
                id={`carousel-${section.id}`}
                className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-0.5 hide-scrollbar snap-x snap-mandatory scroll-smooth"
              >
                {sectionProducts.map((product, index) => (
                  <div key={product.id} className="w-[160px] sm:w-[190px] md:w-[210px] shrink-0 snap-start">
                    <ProductCard product={product} priority={index < 4} />
                  </div>
                ))}
              </div>

              {/* Right Scroll Arrow (Desktop) */}
              {sectionProducts.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`carousel-${section.id}`);
                    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
                  }}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-emerald-600 hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100 z-10 hidden sm:flex"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
      </section>
    );
  })}

  

  </main></CustomerLayout>

}



export function CategoriesPage() {

 const navigate = useNavigate();

 const initCats = readCacheSync('/categories/');
 const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);
 const [loading, setLoading] = useState(() => !initCats);



 useEffect(() => {

 api.get('/categories/').then(res => {

 setCategories(unpack(res));

 }).catch(console.error).finally(() => setLoading(false));

 }, []);



 return (

 <CustomerLayout>

  <main className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-12">

  <div className="w-full mb-6 flex flex-col items-start gap-2">

    <button onClick={() => navigate(-1)} className="text-sm font-bold text-slate-600 hover:underline bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"><ArrowLeft size={16} /> Back</button>

    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">All Categories</h1>

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

 <img loading='lazy' decoding='async' src={optimizeImage(category.image, 300)} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>

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

  const [searchParams, setSearchParams] = useSearchParams(); 
  const query = searchParams.get('search') || ''; 
  const category = searchParams.get('category') || '';
  const [sortOption, setSortOption] = useState('default'); 
  const [error, setError] = useState(''); 

  const params = {};
  if (query) params.search = query;
  if (category) params.category = category;

  const initCats = readCacheSync('/categories/');
  const [categories, setCategories] = useState(initCats ? (initCats.results || initCats) : []);

  const initProducts = readCacheSync('/products/', { params });
  const [products, setProducts] = useState(initProducts ? (initProducts.results || initProducts) : []);
  const [loading, setLoading] = useState(() => !initProducts);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [nextPage, setNextPage] = useState(initProducts ? initProducts.next : null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    api.get('/categories/').then(res => setCategories(unpack(res))).catch(console.error);
  }, []);

  useEffect(() => {
    const params = {};
    if (query) params.search = query;
    if (category) params.category = category;

    const cached = readCacheSync('/products/', { params });
    if (cached) {
      setProducts(cached.results || cached || []);
      setNextPage(cached.next || null);
      setLoading(false);
      setIsRevalidating(true);
    } else {
      setLoading(true);
    }
    
    const timer = setTimeout(() => {
      api.get('/products/', { params })
         .then(res => { 
           setProducts(res.data.results || res.data || []); 
           setNextPage(res.data.next || null);
           setError(''); 
         })
         .catch(() => setError('Could not load products.'))
         .finally(() => { 
           setLoading(false); 
           setIsRevalidating(false);
         });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, category]);

  const loadMore = () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    api.get(nextPage)
      .then(res => {
        setProducts(prev => [...prev, ...(res.data.results || [])]);
        setNextPage(res.data.next || null);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  };

  function updateSearch(value) { const next = new URLSearchParams(searchParams); if (value) next.set('search', value); else next.delete('search'); setSearchParams(next) }

  

  const activeCategoryName = category && categories.length ? categories.find(c => String(c.id) === category)?.name : 'All products';

  

  const sortedProducts = useMemo(() => {
    if (sortOption === 'default') return products;
    return [...products].sort((a, b) => {
      const priceA = parseFloat(a.offer_price || a.regular_price);
      const priceB = parseFloat(b.offer_price || b.regular_price);
      if (sortOption === 'price_low') return priceA - priceB;
      if (sortOption === 'price_high') return priceB - priceA;
      if (sortOption === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });
  }, [products, sortOption]);

  return (

  <CustomerLayout>

    <main className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-12">

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 bg-slate-50 py-3 mb-4 border-b border-slate-200/60 sm:border-none sm:bg-transparent sm:py-0">

        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar items-center">

          <Link to="/"className="flex shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50 transition w-9 h-9 mr-1" aria-label="Back to home"><ArrowLeft size={18} /></Link>

          <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete('category'); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 transition-all ${!category ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50'}`}>All</button>

          {categories.map((item) => <button key={item.id} onClick={() => { const next = new URLSearchParams(searchParams); next.set('category', item.id); setSearchParams(next) }} className={`rounded-full px-4 py-2 text-sm font-bold shrink-0 transition-all ${category === String(item.id) ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 shadow-sm border border-slate-200/60 hover:bg-slate-50'}`}>{item.name}</button>)}

        </div>

      </div>

      <div className="flex items-center justify-between mt-2 flex-wrap gap-3">

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{activeCategoryName}</h1>

        {!loading && (
          <div className="flex items-center gap-3">
            {isRevalidating && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-pulse border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Syncing...
              </span>
            )}
            <select 
              value={sortOption} 
              onChange={e => setSortOption(e.target.value)}
              className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              <option value="default">Relevance</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
            <p className="text-sm font-medium text-slate-500 hidden sm:block">{products.length} products</p>
          </div>
        )}

      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">

        {loading ? Array.from({length: 8}).map((_, i) => <ProductSkeleton key={i} />) : sortedProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} />)}

      </div>
      
      {nextPage && (
        <div className="flex justify-center mt-8 pb-6">
          <button 
            onClick={loadMore} 
            disabled={loadingMore} 
            className="bg-slate-900 text-white hover:bg-black transition-colors px-8 py-3 rounded-xl font-bold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
          >
            {loadingMore ? 'Loading more products...' : 'Load More'}
          </button>
        </div>
      )}

    </main>

  </CustomerLayout>

  )

}



 export function ProductDetailPage() {

 const { id } = useParams(); const navigate = useNavigate(); const { add, isCustomer, favorites, toggleFavorite, cart } = useCart(); const [product, setProduct] = useState(null); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [added, setAdded] = useState(false)

 useEffect(() => { window.scrollTo(0, 0); api.get(`/products/${id}/`).then((response) => setProduct(response.data)).catch(() => setError('This product is unavailable or no longer active.')) }, [id])

 async function addToCart() { if (!isCustomer) { navigate('/login'); return } setAdding(true); try { await add(product); setAdded(true); toast.success('Added to cart'); setTimeout(() => setAdded(false), 3000); } catch (requestError) { toast.error(requestError.response?.data?.detail || 'Could not add this item.') } finally { setAdding(false) } }

 if (error) return <CustomerLayout><main className="mx-auto max-w-3xl p-6"><Link to="/products"className="font-bold text-slate-600">Back to products</Link><p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p></main></CustomerLayout>

 if (!product) return <CustomerLayout><main className="mx-auto max-w-3xl p-6 text-slate-500">Loading product...</main></CustomerLayout>

 const price = product.offer_price || product.regular_price

 const isFav = favorites?.find(f => f.product === product.id);

 const regPrice = Number(product.regular_price);

 const offPrice = Number(product.offer_price);

 const discountPercent = product.offer_price && regPrice > offPrice ? Math.round(((regPrice - offPrice) / regPrice) * 100) : 0;

   const isOutOfStock = !product.is_in_stock || product.stock_quantity <= 0;

   const cartItem = cart?.items?.find(item => item.product === product.id);

 const maxAllowed = product.max_order_quantity > 0 ? Math.min(product.stock_quantity, product.max_order_quantity) : product.stock_quantity;

 const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;



 return <CustomerLayout><main className="mx-auto w-full max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-12"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-600 hover:underline bg-transparent border-none cursor-pointer"><ArrowLeft size={16} /> Back</button><article className="mt-5 overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-200 relative flex flex-col md:flex-row">

 {discountPercent > 0 && (

 <div className="absolute top-0 left-0 z-10 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-br-2xl shadow-sm tracking-wide flex items-center gap-1.5">

 <Zap size={12} fill="currentColor" />

 {discountPercent}% OFF

 </div>

 )}

 <div className="w-full md:w-1/2 md:min-h-[400px]">

 <ProductImage product={product} large />

 </div>

 <div className="w-full md:w-1/2 p-6 sm:p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-center">

 <div className="flex justify-between items-start"><p className="text-sm font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">{product.category_name || 'Grocery'}</p>{isCustomer && <button onClick={() => toggleFavorite(product.id)} className="p-2 -mr-2 rounded-full hover:bg-rose-50 transition"><Heart size={24} fill={isFav ?"currentColor":"none"} className={isFav ?"text-rose-500":"text-slate-300"} /></button>}</div><h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900">{product.name}</h1><p className="mt-1 text-sm font-medium text-slate-500">{product.brand && `${product.brand} · `}{product.unit}</p>

 {product.tags && (

 <div className="flex flex-wrap gap-2 mt-3">

 {product.tags.split(',').map((tag, i) => (

 <span key={i} className="px-2 py-1 bg-violet-50 text-violet-700 text-[10px] font-extrabold uppercase tracking-widest rounded-md">{tag.trim()}</span>

 ))}

 </div>

 )}

 <div className="mt-6 flex items-center gap-3">

 <p className="text-4xl font-black text-slate-600">₹{price}</p>

 {product.offer_price && (

 <p className="text-lg font-bold text-slate-400 line-through mt-1">₹{product.regular_price}</p>

 )}

 </div>

 <button onClick={addToCart} disabled={isOutOfStock || adding || added || isMaxReached} className={`mt-8 hidden md:flex items-center justify-center gap-2 min-h-14 w-full rounded-xl px-4 py-3 text-lg font-extrabold transition-all active:scale-[0.98] ${added ? 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-xl shadow-lg shadow-red-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{!isOutOfStock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : <><ShoppingCart size={20} /> Add to Cart</>) : 'Out of stock'}</button>

 <div className="mt-8 pt-6 border-t border-slate-100 mb-8 md:mb-0">

 <h3 className="text-sm font-extrabold text-slate-900 mb-2">Product Description</h3>

 <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line pb-12 md:pb-0">{product.description || 'Fresh, quality essentials from your local store.'}</p>

 </div>

 </div></article>



 {/* Mobile Sticky Add to Cart */}

 <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 bg-white border-t border-slate-200 p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:hidden">

   <button onClick={addToCart} disabled={isOutOfStock || adding || added || isMaxReached} className={`w-full min-h-[44px] rounded-xl px-4 py-2.5 text-base font-extrabold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${added ? 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm' : isMaxReached ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none border border-transparent disabled:border-slate-200 disabled:active:scale-100'}`}>{!isOutOfStock ? (isMaxReached ? 'Max in cart' : added ? '✓ Added to cart' : adding ? 'Adding...' : <><ShoppingCart size={16} /> Add to Cart · ₹{price}</>) : 'Out of stock'}</button>

 </div>



 </main></CustomerLayout>

}

