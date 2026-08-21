import os

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Feature 3: Out of stock dimming in ProductCard
card_stock_logic = """   const regPrice = Number(product.regular_price);
   const offPrice = Number(product.offer_price);
   const discountPercent = product.offer_price && regPrice > offPrice 
   ? Math.round(((regPrice - offPrice) / regPrice) * 100) 
   : 0;
   
   const isOutOfStock = !product.is_in_stock || product.stock_quantity === 0;"""
content = content.replace('   const regPrice = Number(product.regular_price);', card_stock_logic)

content = content.replace('<div className="overflow-hidden bg-slate-50 relative rounded-t-2xl">', 
                          '<div className={overflow-hidden bg-slate-50 relative rounded-t-2xl }>')

# Add the OUT OF STOCK badge
badge_logic = """   {isOutOfStock && (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl tracking-widest whitespace-nowrap border border-white/20">
         OUT OF STOCK
      </div>
   )}
   <ProductImage product={product} />"""
content = content.replace('<ProductImage product={product} />', badge_logic)


# Feature 1: You might also like in ProductDetailPage
page_hook = """export function ProductDetailPage() {
   const { id } = useParams(); const navigate = useNavigate(); const { add, isCustomer, favorites, toggleFavorite, cart } = useCart(); const [product, setProduct] = useState(null); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [added, setAdded] = useState(false);
   const [related, setRelated] = useState([]);
   
   useEffect(() => { 
      window.scrollTo(0, 0); 
      api.get(/products//).then((response) => {
         setProduct(response.data);
         const catId = typeof response.data.category === 'object' ? response.data.category?.id : response.data.category;
         if (catId) {
             api.get(/products/?category=&limit=10).then(r => {
                 const prods = r.data.results || r.data;
                 setRelated(prods.filter(p => String(p.id) !== String(response.data.id)).slice(0, 6));
             });
         }
      }).catch(() => setError('This product is unavailable or no longer active.')) 
   }, [id])"""
   
old_page_hook = """export function ProductDetailPage() {
   const { id } = useParams(); const navigate = useNavigate(); const { add, isCustomer, favorites, toggleFavorite, cart } = useCart(); const [product, setProduct] = useState(null); const [error, setError] = useState(''); const [adding, setAdding] = useState(false); const [added, setAdded] = useState(false)
   useEffect(() => { window.scrollTo(0, 0); api.get(/products//).then((response) => setProduct(response.data)).catch(() => setError('This product is unavailable or no longer active.')) }, [id])"""

content = content.replace(old_page_hook, page_hook)

# Inject the related UI before </main>
related_ui = """
   {/* Feature 1: You Might Also Like */}
   {related.length > 0 && (
       <div className="mt-12 pt-8 border-t border-slate-100 pb-16 md:pb-0">
           <h2 className="text-xl font-extrabold text-slate-900 mb-6">You might also like</h2>
           <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x">
              {related.map(rel => (
                  <div key={rel.id} className="snap-start flex-shrink-0 w-36 sm:w-44">
                      <ProductCard product={rel} />
                  </div>
              ))}
           </div>
       </div>
   )}
   </main></CustomerLayout>
"""
content = content.replace('   </main></CustomerLayout>', related_ui)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Features 1 & 3 in customer.jsx")
