import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_func = """function ProductImage({ product, large = false }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = [];
  if (product.image) images.push(product.image);
  if (product.gallery_images) {
      product.gallery_images.forEach(g => {
         if (g.image && g.image !== product.image) images.push(g.image);
      });
  }

  if (images.length > 0) {
    if (large && images.length > 1) {
       return (
          <div className="flex flex-col h-full w-full">
            <div className="w-full flex-1 flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 h-72 sm:h-80 md:h-96">
              <img src={optimizeImage(images[activeImage], 600)} className="w-full h-full object-cover mix-blend-multiply" />
            </div>
            <div className="flex gap-3 p-3 overflow-x-auto bg-slate-50 border-t border-slate-100">
               {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shadow-sm transition-all ${activeImage === i ? 'ring-2 ring-indigo-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                     <img src={optimizeImage(img, 100)} className="w-full h-full object-cover" />
                  </button>
               ))}
            </div>
          </div>
       );
    }
    
    return (
       <div className={`w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-transparent to-slate-50/50 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>
           <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-xl z-10 mix-blend-overlay"></div>
           <img loading='lazy' decoding='async' src={optimizeImage(images[0], 600)} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-110"/>
       </div>
    );
  }

  return <div className={`grid w-full place-items-center bg-slate-100 text-3xl font-bold text-slate-300 ${large ? 'h-72 sm:h-80 md:h-full' : 'h-32 sm:h-36'}`}>{product.name?.charAt(0)?.toUpperCase()}</div>
}"""

content = re.sub(r'function ProductImage\(\{ product, large = false \}\) \{.*?\n\}', new_func, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
