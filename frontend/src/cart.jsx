import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft, Eye, EyeOff, CheckCircle2, PackageSearch, Truck, Store, XCircle } from 'lucide-react'
import api from './services/api'
import { CustomerLayout } from './customer-layout'
import { useCart } from './cart-context'

export function CustomerLoginPage() {
 const navigate = useNavigate(); const { syncUser } = useCart(); const location = useLocation(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
 async function submit(event) { event.preventDefault(); setSubmitting(true); setError(''); try { const { data } = await api.post('/auth/login/', { username: email, password }); if (!data.user.is_customer) throw new Error('Please use the owner portal for this account.'); localStorage.setItem('smart-kirana-customer-token', data.access); localStorage.setItem('smart-kirana-customer-refresh', data.refresh); localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user)); syncUser(); navigate('/') } catch (requestError) { setError(requestError.response?.data?.detail || requestError.message || 'Unable to sign in.') } finally { setSubmitting(false) } }
 const signupLink = location.search ? `/signup${location.search}` : '/signup';
 return <CustomerLayout><main className="mx-auto max-w-md px-4 py-10"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"><ArrowLeft size={16} /> Back</button><form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm"><h1 className="text-2xl font-extrabold">Customer sign in</h1><p className="mt-2 text-sm text-slate-600">Sign in to save your cart and place pickup orders.</p>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="mt-5 block text-sm font-bold">Email address <input required type="email"value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/></label><label className="mt-4 block text-sm font-bold">Password <div className="relative mt-1 w-full">
<input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border p-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/>
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
</div></label>
<div className="flex justify-end mt-2">
  <Link to="/forgot-password" className="text-sm font-bold text-primary-700 hover:underline">Forgot password?</Link>
</div><button disabled={submitting} className="mt-6 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">{submitting ? 'Signing in...' : 'Sign in'}</button><p className="mt-4 text-center text-sm">New customer? <Link to={signupLink} className="font-bold text-primary-700">Create account</Link></p></form></main></CustomerLayout>
}

export function CustomerSignupPage() {
  const navigate = useNavigate(); 
  const location = useLocation();
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { first_name: '', email: '', mobile_number: '', password: '', confirm_password: '', referral_code: params.get('ref') || '' };
  });
  const [error, setError] = useState(''); 
  const [submitting, setSubmitting] = useState(false)
 
async function submit(event) {
  event.preventDefault();
  if (form.password !== form.confirm_password) {
    setError('Passwords do not match.');
    return;
  }
  setSubmitting(true);
  setError('');
  try {
    await api.post('/auth/signup/', { ...form, username: form.email });
    alert('Success! Please check your email to activate your account.');
    navigate('/login');
  } catch (requestError) {
    const details = requestError.response?.data;
    setError(details ? Object.values(details).flat().join(' ') : 'Unable to create account.');
  } finally {
    setSubmitting(false);
  }
}

 return <CustomerLayout><main className="mx-auto max-w-md px-4 py-10"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"><ArrowLeft size={16} /> Back</button><form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm"><h1 className="text-2xl font-extrabold">Create account</h1>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 grid gap-4"><label className="text-sm font-bold">Name<input required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/></label><label className="text-sm font-bold">Email address<input required type="email"value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/></label><label className="text-sm font-bold">Mobile number<input required value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/></label><label className="text-sm font-bold">Password<div className="relative mt-1 w-full">
<input required type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-lg border p-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/>
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
</div></label><label className="text-sm font-bold">Confirm password<div className="relative mt-1 w-full">
<input required type={showConfirmPassword ? "text" : "password"} value={form.confirm_password} onChange={(event) => setForm({ ...form, confirm_password: event.target.value })} className="w-full rounded-lg border p-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/>
<button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
</div></label>
 <label className="text-sm font-bold">Referral Code (Optional)
<input name="referral_code" value={form.referral_code} onChange={(event) => setForm({ ...form, referral_code: event.target.value })} placeholder="E.g. REF-A1B2C" className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-5"/>
</label>
 </div><button disabled={submitting} className="mt-6 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">{submitting ? 'Creating...' : 'Create account'}</button></form></main></CustomerLayout>
}

export function CartPage() {
 const navigate = useNavigate(); const { cart, isCustomer, storeSettings, update, applyPromo } = useCart(); const [error, setError] = useState(''); const [promoInput, setPromoInput] = useState(''); const [promoError, setPromoError] = useState(''); const items = cart?.items || []
 if (!isCustomer) return <CustomerLayout><main className="mx-auto max-w-xl p-6 text-center"><h1 className="text-2xl font-extrabold">Your cart</h1><p className="mt-3 text-slate-600">Sign in to add products and place a pickup order.</p><Link to="/login"className="mt-5 inline-block rounded-xl bg-primary-600 px-5 py-3 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">Sign in</Link></main></CustomerLayout>
 async function change(item, quantity) { try { await update(item, quantity) } catch { setError('Could not update your cart.') } }
 
 async function handleApplyPromo(e) {
 e.preventDefault(); setPromoError('');
 try { await applyPromo(promoInput); setPromoInput(''); } catch(err) { setPromoError(err.response?.data?.detail || 'Invalid promo code'); }
 }

 return (
 <CustomerLayout>
 <main className="mx-auto max-w-6xl px-4 py-8">
 <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline">
   <ArrowLeft size={16} /> Back
 </button>
 <h1 className="text-3xl font-extrabold mb-6">Your cart</h1>
 {error && <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 
 {!items.length ? (
 <div className="mt-5 rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
 <ShoppingBasket size={48} />
 </div>
 <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
 <p className="text-slate-500 mb-8 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Browse our products and discover great deals.</p>
 <Link to="/products"className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition hover:bg-primary-700 shadow-sm hover:shadow-md active:scale-[0.98]">
 Start Shopping
 </Link>
 </div>
 ) : (
 <div className="flex flex-col lg:flex-row gap-8 items-start">
 {/* Left Column: Items */}
 <div className="flex-1 w-full space-y-3">
 {items.map((item) => {
 const maxAllowed = item.max_order_quantity > 0 ? Math.min(item.stock_quantity, item.max_order_quantity) : item.stock_quantity;
 const isMaxReached = item.quantity >= maxAllowed;
 return (
 <article key={item.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
 <div className="grid size-16 place-items-center rounded-xl bg-slate-50 font-black text-xl text-primary-300 shrink-0">
 {item.product_name.charAt(0)}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate font-bold text-slate-800 text-lg">{item.product_name}</p>
 <p className="text-sm text-slate-500 font-medium">₹{item.unit_price} · {item.product_unit}</p>
 </div>
 <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm shrink-0 overflow-hidden">
 <button onClick={() => change(item, item.quantity - 1)} className="p-2.5 text-slate-600 hover:text-primary-700 hover:bg-primary-100 transition-colors active:bg-primary-200"><Minus size={18} /></button>
 <span className="w-8 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
 <button onClick={() => change(item, item.quantity + 1)} disabled={isMaxReached} className={`p-2.5 transition-colors shrink-0 ${isMaxReached ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 hover:text-primary-700 hover:bg-primary-100 active:bg-primary-200'}`}><Plus size={18} /></button>
 </div>
 <button onClick={() => change(item, 0)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
 <Trash2 size={20} />
 </button>
 </article>
 )})}
 </div>
 
 {/* Right Column: Summary */}
 <div className="w-full lg:w-96 shrink-0 space-y-5 sticky top-24">
 {/* Promo Code Section */}
 <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
 <form onSubmit={handleApplyPromo} className="flex gap-2">
 <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter promo code"className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"/>
 <button type="submit"disabled={!promoInput} className="rounded-xl bg-slate-900 px-5 py-2.5 font-bold text-white disabled:bg-slate-300 hover:bg-slate-800 transition-colors shadow-sm active:scale-95 disabled:active:scale-100">Apply</button>
 </form>
 {promoError && <p className="mt-3 text-xs text-red-600 font-bold">{promoError}</p>}
 {cart?.promo_code && (
 <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 p-4 border border-green-100 text-sm text-green-700 shadow-sm">
 <div><span className="font-extrabold uppercase tracking-wider text-xs block text-green-600 mb-0.5">Code Applied</span><span className="font-bold text-base">{cart.promo_code}</span></div>
 <button onClick={() => applyPromo('')} className="text-xs font-bold bg-white px-3 py-1.5 rounded-lg shadow-sm border border-green-200 hover:bg-green-100 transition-colors">Remove</button>
 </div>
 )}
 </section>

 {/* Order Summary Section */}
 <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
 <h2 className="text-lg font-extrabold text-slate-900 mb-4">Order Summary</h2>
 <div className="space-y-3">
 <div className="flex justify-between text-sm text-slate-600 font-medium"><span>Subtotal</span><span className="text-slate-900 font-bold">₹{cart?.subtotal || '0.00'}</span></div>
 <div className="flex justify-between text-sm text-primary-700 font-medium"><span>Product Savings</span><span className="font-bold">₹{cart?.discount || '0.00'}</span></div>
 {cart?.promo_discount > 0 && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Promo Discount</span><span>- ₹{cart.promo_discount}</span></div>}
 {cart?.packaging_fee > 0 && <div className="flex justify-between text-sm text-slate-600 font-medium"><span>Packaging Fee</span><span className="text-slate-900 font-bold">₹{cart.packaging_fee}</span></div>}
 </div>
 <div className="mt-5 flex justify-between border-t border-slate-100 pt-5 text-xl font-black text-slate-900"><span>Total Due</span><span>₹{cart?.total || '0.00'}</span></div>
 
 {storeSettings?.is_open === false ? (
 <div className="mt-6 rounded-xl bg-red-50 p-4 text-center font-bold text-red-700 border border-red-100">The store is currently closed.</div>
 ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
 <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is ₹{storeSettings.min_order_amount}</div>
 ) : (
 <>
 <button onClick={() => navigate('/checkout')} className="mt-6 hidden lg:block min-h-14 w-full rounded-xl bg-primary-600 font-bold text-white shadow-sm hover:bg-primary-700 hover:shadow-md transition-all active:scale-[0.98] text-lg">Continue to pickup</button>
 <p className="mt-4 hidden lg:block text-center text-xs text-slate-500 font-medium">Pay securely online or at store pickup.</p>
 </>
 )}
 </section>
 </div>
 
 {/* Mobile Sticky Checkout Bar */}
 {storeSettings?.is_open !== false && !(Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount)) && items.length > 0 && (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 bg-white border-t border-slate-200 p-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] lg:hidden">
      <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{cart?.total}</p>
        </div>
        <button onClick={() => navigate('/checkout')} className="flex-1 min-h-[44px] rounded-xl bg-primary-600 font-bold text-white shadow-sm active:scale-95 transition-all">
          Checkout
        </button>
      </div>
    </div>
  )}
 </div>
 )}
 </main>
 </CustomerLayout>
 )
}

export function CheckoutPage() {
 const navigate = useNavigate(); const { cart, isCustomer, storeSettings, refresh } = useCart(); const [time, setTime] = useState('As soon as possible'); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
 const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);
 
 useEffect(() => {
   if (isCustomer) {
     api.get('/auth/wallet/').then(res => setWalletBalance(parseFloat(res.data.balance))).catch(console.error);
   }
 }, [isCustomer]);

 if (!isCustomer) return <CartPage />
 
 async function submit() { 
  if (orderType === 'DELIVERY') {
    if (!deliveryAddress.trim()) { setError('Please enter a delivery address.'); return; }
    if (!deliveryPincode.trim()) { setError('Please enter your pincode.'); return; }
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

 return <CustomerLayout><main className="mx-auto max-w-xl px-4 py-6"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"><ArrowLeft size={16} /> Back</button><h1 className="text-3xl font-extrabold">Checkout</h1><p className="mt-2 text-slate-600">Review your order and pick a time.</p>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
  
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
      <label className="text-sm font-bold block">Delivery Address<textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="House/Flat No, Street, Landmark..." className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none h-20" required></textarea></label>
      <label className="text-sm font-bold block">Pincode<input type="text" value={deliveryPincode} onChange={(e) => setDeliveryPincode(e.target.value)} placeholder="e.g. 530001" className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" required/></label>
      
      {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
        <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-lg border border-red-100">
          Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
        </div>
      )}
    </div>
  )}
  <label className="mt-4 block text-sm font-bold">Note for the store (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="E.g., Please pack fragile items carefully..." className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-16" /></label>
 
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
 <button onClick={submit} disabled={loading} className="mt-5 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white disabled:bg-slate-300 hover:bg-primary-700 active:scale-[0.98] transition-all">{loading ? 'Processing...' : (finalTotal > 0 ? 'Place order (Pay at store)' : 'Place order (Paid via Wallet)')}</button>
 )}
 </div></main></CustomerLayout>
}

export function OrderDetailPage() {
 const { id } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null); const [error, setError] = useState('')
 
 useEffect(() => {
  const fetchOrder = () => api.get(`/orders/${id}/`, { params: { t: Date.now() } }).then((response) => setOrder(response.data)).catch(() => setError('Could not load this order.'));
  fetchOrder();
  const intervalId = setInterval(fetchOrder, 5000); return () => clearInterval(intervalId); 
 }, [id]); 
 
 const getSteps = (type) => [
   { id: 'NEW', label: 'Order Placed', desc: 'We received your order', icon: CheckCircle2 },
   { id: 'ACCEPTED', label: 'Processing', desc: 'Store is packing your items', icon: PackageSearch },
   { id: 'READY', label: type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup', desc: type === 'DELIVERY' ? 'Your order is on the way!' : 'Waiting for you at the store', icon: type === 'DELIVERY' ? Truck : Store },
   { id: 'COMPLETED', label: type === 'DELIVERY' ? 'Delivered' : 'Completed', desc: type === 'DELIVERY' ? 'Order delivered successfully' : 'Order picked up successfully', icon: CheckCircle2 }
 ];
 
 const statusIndex = ['NEW', 'ACCEPTED', 'READY', 'COMPLETED'];

 return (
  <CustomerLayout>
    <main className="mx-auto max-w-xl px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0">
        <ArrowLeft size={16} /> Back
      </button>
      
      {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {!order && !error && <p className="text-slate-500">Loading order...</p>}
      
      {order && (
        <>
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="text-sm font-bold text-primary-700">Order confirmed</p>
              <h1 className="mt-1 text-3xl font-extrabold">{order.id}</h1>
            </div>
            {order.status === 'COMPLETED' && (
              <Link to={`/orders/${order.id}/invoice`} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition block text-center shadow-sm">
                View Invoice
              </Link>
            )}
          </div>

          {/* Tracking Timeline UI */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Track Order</h2>
            {order.status === 'REJECTED' ? (
              <div className="flex items-center gap-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
                <XCircle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Order Cancelled</h3>
                  <p className="text-sm opacity-90">This order was cancelled and any wallet balance has been refunded.</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100"></div>
                
                <div className="space-y-6 relative">
                  {getSteps(order.order_type).map((step, index) => {
                    const currentIndex = statusIndex.indexOf(order.status);
                    const isCompleted = currentIndex >= index;
                    const isActive = currentIndex === index;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className={`flex gap-4 items-start ${!isCompleted ? 'opacity-40' : ''}`}>
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'} ${isActive ? 'ring-4 ring-primary-100' : ''}`}>
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <div className="pt-2 flex-1">
                          <h4 className={`text-sm font-bold ${isActive ? 'text-primary-700' : 'text-slate-900'}`}>{step.label}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {order.customer_note && (
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-slate-500 mb-1">Your Note</p>
              <p className="text-sm text-slate-800">{order.customer_note}</p>
            </div>
          )}
          {order.owner_note && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-primary-600 mb-1">Store Reply</p>
              <p className="text-sm text-primary-900">{order.owner_note}</p>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">Order Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                  {item.quantity} x {item.product_name_snapshot} 
                  {item.status === 'REJECTED' && <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">Unavailable</span>}
                </span>
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-bold'}>₹{item.subtotal}</span>
              </div>
            ))}
            
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Billing Summary</h2>
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-900">₹{order.items.reduce((sum, item) => sum + (item.status !== 'REJECTED' ? parseFloat(item.subtotal) : 0), 0).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_applied) > 0 && <div className="flex justify-between text-primary-700"><span>Product Savings</span><span>- ₹{order.discount_applied}</span></div>}
                {parseFloat(order.promo_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Promo Discount</span><span>- ₹{order.promo_discount}</span></div>}
                {parseFloat(order.packaging_fee) > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span className="text-slate-900">₹{order.packaging_fee}</span></div>}
                {parseFloat(order.delivery_fee) > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="text-slate-900">₹{order.delivery_fee}</span></div>}
                {parseFloat(order.wallet_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Wallet Applied</span><span>- ₹{order.wallet_discount}</span></div>}
              </div>
              <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-slate-100">
                <span className="text-slate-900">{order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}</span>
                <span className="text-primary-600">₹{order.total_amount}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 text-center font-medium shadow-sm">
            {order.order_type === 'DELIVERY' ? (
              <>
                <Truck className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Delivery to: <br/>
                <strong className="text-slate-800">{order.delivery_address}</strong>
                {order.delivery_pincode && <><br/>Pincode: {order.delivery_pincode}</>}
              </>
            ) : (
              <>
                <Store className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Pickup: <strong className="text-slate-800">{order.pickup_time || 'As soon as possible'}</strong> <br/>
                Pay at store
              </>
            )}
          </div>
        </>
      )}
    </main>
  </CustomerLayout>
 );
}
