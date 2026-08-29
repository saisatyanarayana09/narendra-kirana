import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Package, Clock, XCircle, ChevronRight, Printer , MapPin } from 'lucide-react';
import api from '../../services/api';

const OrderDetails = () => {
 const { id } = useParams();
 const navigate = useNavigate();
 const [order, setOrder] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 const [packedItems, setPackedItems] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
 const [ownerNote, setOwnerNote] = useState('');
 const [savingNote, setSavingNote] = useState(false);

  const fetchOrder = useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const response = await api.get(`/orders/${id}/`, { params: { t: Date.now() } });
      setOrder(response.data);
      if (!isPoll) setOwnerNote(response.data.owner_note || '');
    } catch (err) {
      console.error(err);
      if (!isPoll) setError('Failed to fetch order details.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => fetchOrder(true), 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

 const updateStatus = async (newStatus) => {
 try {
 await api.patch(`/orders/${id}/status/`, { status: newStatus });
 fetchOrder(); // refresh order data
 } catch (err) {
 console.error(err);
 alert(err.response?.data?.detail || 'Failed to update order status.');
 }
 };

 const togglePacked = (itemId) => {
 setPackedItems(prev => ({
 ...prev,
 [itemId]: !prev[itemId]
 }));
 };

 const saveNote = async () => {
 setSavingNote(true);
 try {
 await api.patch(`/orders/${id}/owner_note/`, { owner_note: ownerNote });
 fetchOrder();
 } catch (err) {
 alert('Failed to save note.');
 } finally {
 setSavingNote(false);
 }
 };

 const rejectItem = async (itemId) => {
 if (!window.confirm('Are you sure you want to reject this item? It will be removed from the order and the total price will be reduced.')) return;
 try {
 await api.post(`/orders/${id}/reject_item/`, { item_id: itemId });
 fetchOrder();
 } catch (err) {
 alert(err.response?.data?.detail || 'Failed to reject item.');
 }
 };

 if (loading) return <div className="p-12 text-center text-gray-500">Loading order...</div>;
 if (error || !order) return <div className="p-12 text-center text-red-500">{error}</div>;

 const activeItems = order.items.filter(i => i.status !== 'REJECTED');
 const allPacked = activeItems.length > 0 && activeItems.every(item => packedItems[item.id]);

 const getStatusBanner = () => {
 switch(order.status) {
 case 'NEW': return { bg: 'bg-indigo-500', icon: Clock, text: 'New Order Received', msg: 'Review the items and accept the order.' };
 case 'ACCEPTED': return { bg: 'bg-blue-500', icon: CheckCircle, text: 'Order Accepted', msg: 'Ready to start packing?' };
 case 'PREPARING': return { bg: 'bg-amber-500', icon: Package, text: 'Packing in Progress', msg: 'Use the checklist below to pack items.' };
 case 'READY': return { bg: 'bg-emerald-500', icon: CheckCircle, text: 'Ready for Pickup', msg: 'Waiting for the customer to arrive.' };
 case 'COMPLETED': return { bg: 'bg-slate-700', icon: CheckCircle, text: 'Completed', msg: 'Order has been handed over successfully.' };
 case 'REJECTED': return { bg: 'bg-rose-500', icon: XCircle, text: 'Rejected', msg: 'Order was canceled/rejected.' };
 default: return { bg: 'bg-slate-500', icon: Package, text: 'Unknown', msg: '' };
 }
 };

 const banner = getStatusBanner();
 const BannerIcon = banner.icon;

 return (
 <div className="max-w-4xl mx-auto space-y-6">
  <div className="flex justify-between items-center">
  <Link 
  to="/owner/orders"
  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium"
  >
  <ArrowLeft className="w-4 h-4 mr-1"/> Back to Orders
  </Link>
  <Link 
  to={`/owner/orders/${id}/invoice`} 
  className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-bold shadow-sm transition-colors"
  >
  <Printer className="w-4 h-4 mr-2"/> Print Invoice
  </Link>
  </div>

 {/* Status Banner */}
 <div className={`${banner.bg} rounded-2xl p-6 text-white flex items-center justify-between shadow-sm`}>
 <div className="flex items-center space-x-4">
 <div className="p-3 bg-white bg-opacity-20 rounded-xl">
 <BannerIcon className="w-8 h-8 text-white"/>
 </div>
 <div>
 <h1 className="text-2xl font-bold">{banner.text}</h1>
 <p className="text-white text-opacity-90">{banner.msg}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-sm text-white text-opacity-80 uppercase tracking-wider font-bold">Order ID</p>
 <p className="text-3xl font-black">{order.id}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 
 <div className="md:col-span-2 space-y-6">
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
 <h2 className="text-lg font-bold text-slate-900">Order Items</h2>
 <span className="text-sm font-bold text-slate-500">{order.items.length} items</span>
 </div>
 <div className="divide-y divide-slate-100">
 {order.items.map(item => {
 const isRejected = item.status === 'REJECTED';
 return (
 <div 
 key={item.id} 
 className={`p-6 flex items-center space-x-4 transition-colors ${
 order.status === 'PREPARING' && packedItems[item.id] ? 'bg-emerald-50/50' : 'hover:bg-slate-50 '
 }`}
 onClick={() => order.status === 'PREPARING' && !isRejected && togglePacked(item.id)}
 >
 {/* Packing Checkbox (Only interactive during PREPARING) */}
 {order.status === 'PREPARING' && (
 <div className="flex-shrink-0 cursor-pointer">
 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
 isRejected ? 'border-slate-200 bg-slate-100' :
 packedItems[item.id] ? 'bg-emerald-500 border-emerald-500 shadow-inner' : 'border-slate-300 bg-white '
 }`}>
 {packedItems[item.id] && !isRejected && <CheckCircle className="w-5 h-5 text-white"/>}
 {isRejected && <XCircle className="w-5 h-5 text-slate-400"/>}
 </div>
 </div>
 )}

 <div className="flex-1">
 <h3 className={`text-lg font-bold transition-all ${isRejected ? 'text-slate-400 line-through' : (packedItems[item.id] && order.status === 'PREPARING' ? 'text-emerald-800 line-through opacity-70' : 'text-slate-900 ')}`}>
 {item.product_name_snapshot}
 {isRejected && <span className="ml-2 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block">Rejected</span>}
 </h3>
 <p className={`text-sm font-medium mt-0.5 ${isRejected ? 'text-slate-400' : 'text-slate-500'}`}>{item.unit_snapshot} • ₹{item.price_snapshot} each</p>
 </div>
 <div className="text-right flex flex-col items-end">
 <p className={`text-2xl font-black ${isRejected ? 'text-slate-400 line-through' : 'text-slate-900'}`}>×{item.quantity}</p>
 <p className={`text-sm font-bold mt-1 ${isRejected ? 'text-slate-400 line-through' : 'text-indigo-600'}`}>₹{item.subtotal}</p>
 
 {!isRejected && ['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status) && (
 <button 
 onClick={(e) => { e.stopPropagation(); rejectItem(item.id); }}
 className="mt-2 text-xs font-bold text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-500 px-2 py-1 rounded transition-colors"
 >
 Reject Item
 </button>
 )}
 </div>
 </div>
 )})}
 </div>
 </div>
 
 {/* Notes Section */}
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
 <h2 className="text-lg font-bold text-slate-900">Order Notes</h2>
 </div>
 <div className="p-6 space-y-4">
 {order.customer_note ? (
 <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
 <h3 className="text-xs font-extrabold text-amber-600 uppercase tracking-widest mb-2">Note from Customer</h3>
 <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{order.customer_note}</p>
 </div>
 ) : (
 <p className="text-sm text-slate-500 italic">No note from customer.</p>
 )}
 
 <div className="pt-2">
 <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Your Reply Note</h3>
 <textarea 
 value={ownerNote} 
 onChange={e => setOwnerNote(e.target.value)} 
 placeholder="Write a note to the customer..."
 className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
 />
 <div className="flex justify-end mt-2">
 <button 
 onClick={saveNote}
 disabled={savingNote}
 className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black transition-colors disabled:bg-slate-400"
 >
 {savingNote ? 'Saving...' : 'Save Note'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Sidebar (Actions & Summary) */}
 <div className="space-y-6">
 {/* Action Card */}
 {['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
 <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-5">Next Step</h3>
 
 {order.status === 'NEW' && (
 <div className="space-y-3">
 <button onClick={() => updateStatus('ACCEPTED')} disabled={isUpdating} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center">
 Accept Order <ChevronRight className="w-5 h-5 ml-1"/>
 </button>
 <button onClick={() => updateStatus('REJECTED')} disabled={isUpdating} className="w-full py-3 bg-rose-50 text-rose-700 rounded-xl font-bold hover:bg-rose-100 transition-colors">
 Reject
 </button>
 </div>
 )}

 {order.status === 'ACCEPTED' && (
 <button onClick={() => updateStatus('PREPARING')} disabled={isUpdating} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition flex items-center justify-center shadow-sm">
 <Package className="w-5 h-5 mr-2"/> Start Packing
 </button>
 )}

 {order.status === 'PREPARING' && (
 <div className="space-y-2">
 <button 
 onClick={() => updateStatus('READY')} disabled={isUpdating || !allPacked} 
 disabled={!allPacked}
 className={`w-full py-4 rounded-xl font-bold transition flex items-center justify-center ${
 allPacked ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
 }`}
 >
 <CheckCircle className="w-5 h-5 mr-2"/> Mark as Ready
 </button>
 {!allPacked && (
 <p className="text-xs text-center text-amber-600 font-medium mt-2">Please check off all items first.</p>
 )}
 </div>
 )}

 {order.status === 'READY' && (
 <div className="space-y-3">
 <p className="text-sm text-slate-600 font-medium text-center bg-slate-50 p-3 rounded-xl border border-slate-100">
 {parseFloat(order.total_amount) > 0 ? (
 <>Customer will pay <strong className="text-slate-900">₹{order.total_amount}</strong> at store.</>
 ) : (
 <>Order fully paid via <strong className="text-emerald-600">Wallet</strong>.</>
 )}
 </p>
 <button onClick={() => updateStatus('COMPLETED')} disabled={isUpdating} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center shadow-sm">
 {parseFloat(order.total_amount) > 0 ? 'Payment Received & Complete' : 'Handover & Complete'}
 </button>
 </div>
 )}
 </div>
 )}

 {/* Summary Card */}
 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
 <div>
 <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Customer</h3>
 <p className="font-bold text-slate-900">User ID: {order.customer}</p>
 </div>
 <div>
 <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{order.order_type === 'DELIVERY' ? 'Delivery Time' : 'Pickup Time'}</h3>
 <p className="font-bold text-slate-900">{order.pickup_time || 'As soon as possible'}</p>
 </div>
 {order.order_type === 'DELIVERY' && (
 <div className="col-span-1 md:col-span-2 mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
 <h3 className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
   <Package size={14} /> Delivery Address
 </h3>
 <p className="font-bold text-indigo-900 whitespace-pre-line text-sm">{order.delivery_address}</p>
 {order.delivery_pincode && <p className="text-xs text-indigo-700 mt-1 font-semibold">Pincode: {order.delivery_pincode}</p>}
 
 {order.delivery_latitude && order.delivery_longitude && (
   <a 
     href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`}
     target="_blank"
     rel="noreferrer"
     className="mt-3 flex items-center justify-center w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
   >
     <MapPin className="w-4 h-4 mr-2" /> Get Delivery Directions
   </a>
 )}
 </div>
 )}
 <div className="border-t border-slate-100 pt-5 mt-5">
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Subtotal</span>
 <span className="text-slate-900">₹{activeItems.reduce((acc, item) => acc + parseFloat(item.subtotal), 0).toFixed(2)}</span>
 </div>
 {parseFloat(order.delivery_fee) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Delivery Fee</span>
 <span className="text-slate-900">₹{order.delivery_fee}</span>
 </div>
 )}
 {parseFloat(order.packaging_fee) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-slate-500">Packaging Fee</span>
 <span className="text-slate-900">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
 </div>
 )}
 {parseFloat(order.promo_discount) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-emerald-600">Promo Discount</span>
 <span className="text-emerald-600">-₹{parseFloat(order.promo_discount).toFixed(2)}</span>
 </div>
 )}
 {parseFloat(order.wallet_discount) > 0 && (
 <div className="flex justify-between text-sm font-medium mb-3">
 <span className="text-emerald-600">Wallet Applied</span>
 <span className="text-emerald-600">-₹{parseFloat(order.wallet_discount).toFixed(2)}</span>
 </div>
 )}
 <div className="flex justify-between text-sm font-medium mb-4">
 <span className="text-slate-500">Payment Method</span>
 <span className="font-bold text-slate-800">
   {parseFloat(order.total_amount) === 0 ? 'Wallet Full' : (parseFloat(order.wallet_discount) > 0 ? 'Hybrid (Wallet + Cash)' : 'Cash at Store')}
 </span>
 </div>
 <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
 <span className="text-lg font-extrabold text-slate-900">Total Due</span>
 <span className="text-2xl font-black text-indigo-700 tracking-tight">₹{order.total_amount}</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default OrderDetails;
