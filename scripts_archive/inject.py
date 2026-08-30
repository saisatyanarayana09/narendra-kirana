import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_checkout = """export function CheckoutPage() {
   const navigate = useNavigate(); const { cart, isCustomer, storeSettings, refresh } = useCart(); const [time, setTime] = useState('As soon as possible'); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
   const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);
   const [orderType, setOrderType] = useState('PICKUP');
   const [deliveryAddress, setDeliveryAddress] = useState('');
   const [deliveryPincode, setDeliveryPincode] = useState('');
   
   // New Address Management State
   const [addresses, setAddresses] = useState([]);
   const [selectedAddressId, setSelectedAddressId] = useState(null);
   const [showAddressForm, setShowAddressForm] = useState(false);
   const [editingAddressId, setEditingAddressId] = useState(null);
   const [addressForm, setAddressForm] = useState({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '' });
   
   const fetchAddresses = () => {
     api.get('/auth/addresses/').then(res => {
       const data = res.data.results || res.data;
       setAddresses(data);
       if (data && data.length > 0 && !selectedAddressId) {
         const defaultAddr = data.find(a => a.is_default) || data[0];
         setSelectedAddressId(defaultAddr.id);
       }
     }).catch(console.error);
   };

   useEffect(() => {
     if (isCustomer) {
       api.get('/auth/wallet/').then(res => setWalletBalance(parseFloat(res.data.balance))).catch(console.error);
       fetchAddresses();
     }
   }, [isCustomer]);

   // Whenever selected address changes, update the string fields for the backend payload
   useEffect(() => {
     if (selectedAddressId) {
       const addr = addresses.find(a => a.id === selectedAddressId);
       if (addr) {
         const formatted = [addr.street, addr.landmark, addr.city, addr.state].filter(Boolean).join(', ');
         setDeliveryAddress(formatted);
         setDeliveryPincode(addr.zip_code || '');
       }
     }
   }, [selectedAddressId, addresses]);

   const saveAddress = async (e) => {
     e.preventDefault();
     setLoading(true);
     try {
       if (editingAddressId) {
         await api.put(`/auth/addresses/${editingAddressId}/`, addressForm);
       } else {
         const res = await api.post('/auth/addresses/', addressForm);
         setSelectedAddressId(res.data.id);
       }
       setShowAddressForm(false);
       setEditingAddressId(null);
       fetchAddresses();
     } catch (err) {
       setError('Failed to save address.');
     } finally {
       setLoading(false);
     }
   };

 if (!isCustomer) return <CartPage />
 
 async function submit() { 
  if (orderType === 'DELIVERY') {
    if (!selectedAddressId && (!deliveryAddress.trim() || !deliveryPincode.trim())) { 
        setError('Please select or add a delivery address.'); return; 
    }
  }
  setLoading(true); setError(''); 
  try { 
    const response = await api.post('/orders/', { 
      pickup_time: time, 
      customer_note: note, 
      use_wallet: useWallet,
      order_type: orderType,
      delivery_address: deliveryAddress,
      delivery_pincode: deliveryPincode
    }); 
    await refresh(); 
    navigate(`/orders/${response.data.id}`) 
  } catch (requestError) { 
    setError(requestError.response?.data?.detail || 'Could not place your order.') 
  } finally { 
    setLoading(false) 
  } 
 }
 
 const cartSubtotal = parseFloat(cart?.subtotal || 0);
 let deliveryFee = 0;
 if (orderType === 'DELIVERY' && storeSettings?.is_home_delivery_active) {
   if (parseFloat(storeSettings.free_delivery_threshold) > 0 && cartSubtotal >= parseFloat(storeSettings.free_delivery_threshold)) {
     deliveryFee = 0;
   } else {
     deliveryFee = parseFloat(storeSettings.delivery_fee || 0);
   }
 }
 const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;
 const finalTotal = useWallet ? Math.max(0, cartTotal - walletBalance) : cartTotal;
 const walletApplied = useWallet ? Math.min(cartTotal, walletBalance) : 0;

 return <CustomerLayout><main className="mx-auto max-w-xl px-4 py-6"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-0"><ArrowLeft size={16} /> Back</button><h1 className="text-3xl font-extrabold">Checkout</h1><p className="mt-2 text-slate-600">Review your order and pick a time.</p>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
  
  <div className="mb-6">
    <label className="text-sm font-bold block mb-2">Order Type</label>
    <div className="flex bg-slate-100 p-1 rounded-xl">
      <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'PICKUP' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>🏪 Store Pickup</button>
      <button 
        onClick={() => storeSettings?.is_home_delivery_active ? setOrderType('DELIVERY') : null} 
        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'DELIVERY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'} ${!storeSettings?.is_home_delivery_active ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700'}`}
      >
        🛵 Home Delivery {!storeSettings?.is_home_delivery_active && '(Unavailable)'}
      </button>
    </div>
  </div>

  {orderType === 'PICKUP' ? (
    <label className="text-sm font-bold block">Pickup time<select value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option></select></label>
  ) : (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold">Select Delivery Address</label>
        {!showAddressForm && (
            <button onClick={() => { setAddressForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '' }); setEditingAddressId(null); setShowAddressForm(true); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">+ Add New</button>
        )}
      </div>

      {showAddressForm ? (
        <form onSubmit={saveAddress} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm text-slate-900">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
            <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2">
               <input placeholder="Title (e.g. Home, Office)" value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div className="col-span-2">
               <textarea placeholder="House/Flat No, Street" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"></textarea>
             </div>
             <div className="col-span-2">
               <input placeholder="Landmark (Optional)" value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div>
               <input placeholder="City" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div>
               <input placeholder="State" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div className="col-span-2">
               <input placeholder="Pincode" value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Save Address</button>
        </form>
      ) : (
        <div className="space-y-3">
            {addresses.length === 0 ? (
                <div className="p-4 border border-slate-200 border-dashed rounded-xl text-center text-sm text-slate-500">No saved addresses. Please add one.</div>
            ) : (
                addresses.map(addr => (
                  <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedAddressId === addr.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-indigo-600' : 'border-slate-300'}`}>
                        {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-slate-900">{addr.title}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setAddressForm(addr); setEditingAddressId(addr.id); setShowAddressForm(true); }} className="text-slate-400 hover:text-indigo-600 p-1">
                                <Edit2 size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{addr.street}</p>
                        {addr.landmark && <p className="text-xs text-slate-600 leading-relaxed">{addr.landmark}</p>}
                        <p className="text-xs text-slate-600 font-medium mt-1">{addr.city}, {addr.state} - {addr.zip_code}</p>
                    </div>
                  </div>
                ))
            )}
        </div>
      )}
      
      {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-lg border border-red-100 mt-4">
          Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
        </div>
      )}
    </div>
  )}
  <label className="mt-4 block text-sm font-bold">Note for the store (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="E.g., Please pack fragile items carefully..." className="mt-4 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-16" /></label>
 
 {walletBalance > 0 && (
   <div className="mt-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-between">
     <div>
       <div className="font-bold text-emerald-800">Use Wallet Balance</div>
       <div className="text-sm text-emerald-600">Available: ₹{walletBalance.toFixed(2)}</div>
     </div>
     <label className="relative inline-flex items-center cursor-pointer">
       <input type="checkbox" className="sr-only peer" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
       <div className="w-11 h-6 bg-emerald-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
     </label>
   </div>
 )}

 <div className="mt-5 space-y-2 text-sm text-slate-600 border-t pt-4"><div className="flex justify-between"><span>Subtotal</span><span>₹{cart?.subtotal || '0.00'}</span></div><div className="flex justify-between text-primary-700"><span>Product Savings</span><span>₹{cart?.discount || '0.00'}</span></div>{cart?.promo_discount > 0 && <div className="flex justify-between text-green-600 font-bold"><span>Promo Discount</span><span>- ₹{cart.promo_discount}</span></div>}{cart?.packaging_fee > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span>₹{cart.packaging_fee}</span></div>}
   {orderType === 'DELIVERY' && <div className="flex justify-between"><span>Delivery Fee</span><span className={deliveryFee === 0 ? 'text-green-600 font-bold' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>}
 {useWallet && walletApplied > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Wallet Applied</span><span>- ₹{walletApplied.toFixed(2)}</span></div>}
 <div className="flex justify-between text-lg font-extrabold text-black pt-2"><span>Total Due</span><span>₹{finalTotal.toFixed(2)}</span></div></div>
 {storeSettings?.is_open === false ? (
 <div className="mt-5 rounded-xl bg-red-50 p-4 text-center font-bold text-red-700 border border-red-100">The store is currently closed. Cannot place order.</div>
 ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
 <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is ₹{storeSettings.min_order_amount}</div>
 ) : (
 <button onClick={submit} disabled={loading || (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode))} className="mt-5 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white disabled:bg-slate-300 hover:bg-primary-700 active:scale-[0.98] transition-all">{loading ? 'Processing...' : (finalTotal > 0 ? 'Place order (Pay at store)' : 'Place order (Paid via Wallet)')}</button>
 )}
 </div></main></CustomerLayout>
}"""

match = re.search(r'(export function CheckoutPage\(\) \{.*?\nexport function OrderDetailPage)', content, flags=re.DOTALL)
if match:
    content = content.replace(match.group(1), new_checkout + "\n\nexport function OrderDetailPage")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced!")
else:
    print("Pattern not found!")
