import os

filepath = 'S:/smart-kirana/frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace OrderDetailPage start
hook = """export function OrderDetailPage() {
   const { id } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null); const [error, setError] = useState('')
   
   useEffect(() => {
    const fetchOrder = () => api.get(/orders//, { params: { t: Date.now() } }).then((response) => setOrder(response.data)).catch(() => setError('Could not load this order.'));
    fetchOrder();
    const intervalId = setInterval(fetchOrder, 5000); return () => clearInterval(intervalId); }, [id]); 

   const statusFlow = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
   const currentIndex = order ? statusFlow.indexOf(order.status) : -1;
   const isRejected = order && (order.status === 'REJECTED' || order.status === 'CANCELLED');

   return <CustomerLayout><main className="mx-auto max-w-xl px-4 py-6">
   <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0"><ArrowLeft size={16} /> Back</button>
   {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
   {!order && !error && <p className="text-slate-500">Loading order...</p>}
   {order && <>
   
   {/* Feature 2: Order Progress Tracker */}
   <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
       <div className="flex justify-between items-center mb-6">
           <h2 className="text-lg font-extrabold text-slate-900">Track Order</h2>
           {isRejected ? (
               <span className="bg-red-100 text-red-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">{order.status}</span>
           ) : (
               <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">{order.status}</span>
           )}
       </div>
       
       {!isRejected && (
           <div className="relative">
               <div className="absolute top-4 left-6 right-6 h-1 bg-slate-100 rounded-full"></div>
               <div className="absolute top-4 left-6 h-1 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: ${Math.max(0, currentIndex / (statusFlow.length - 1)) * (100 - 12)}% }}></div>
               
               <div className="flex justify-between relative z-10">
                   {[
                       { label: 'Placed', idx: 0 },
                       { label: 'Accepted', idx: 1 },
                       { label: 'Preparing', idx: 2 },
                       { label: 'Ready', idx: 3 },
                       { label: 'Done', idx: 4 }
                   ].map((step, i) => {
                       const active = currentIndex >= step.idx;
                       const current = currentIndex === step.idx;
                       return (
                           <div key={i} className="flex flex-col items-center gap-2">
                               <div className={w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300  }>
                                   {i + 1}
                               </div>
                               <span className={	ext-[10px] font-bold sm:text-xs }>{step.label}</span>
                           </div>
                       )
                   })}
               </div>
           </div>
       )}
   </div>

   <div className="flex justify-between items-start">"""

old_hook = """export function OrderDetailPage() {
   const { id } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null); const [error, setError] = useState('')
   
   useEffect(() => {
    const fetchOrder = () => api.get(/orders//, { params: { t: Date.now() } }).then((response) => setOrder(response.data)).catch(() => setError('Could not load this order.'));
    fetchOrder();
    const intervalId = setInterval(fetchOrder, 5000); return () => clearInterval(intervalId); }, [id]); return <CustomerLayout><main className="mx-auto max-w-xl px-4 py-6"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0"><ArrowLeft size={16} /> Back</button>{error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}{!order && !error && <p className="text-slate-500">Loading order...</p>}{order && <><div className="flex justify-between items-start">"""

content = content.replace(old_hook, hook)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected Feature 2 in cart.jsx")
