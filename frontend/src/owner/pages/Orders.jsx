import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Search, Clock, CheckCircle, Package, Printer } from 'lucide-react';
import api from '../../services/api';

const Orders = () => {
 const [orders, setOrders] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('ALL'); // ALL, NEW, PREPARING, READY, COMPLETED
 const [searchTerm, setSearchTerm] = useState('');

 const fetchOrders = async (isPoll = false) => {
 try {
 if (!isPoll) setLoading(true);
 const response = await api.get('/orders/', { params: { t: Date.now() } });
 setOrders(response.data.results || response.data);
 } catch (err) {
 console.error(err);
 if (!isPoll) alert('Failed to fetch orders.');
 } finally {
 if (!isPoll) setLoading(false);
 }
 };

 const rejectOrder = async (id) => {
    if (!window.confirm('Are you sure you want to reject this order?')) return;
    try {
      await api.patch(`/orders/${id}/status/`, { status: 'REJECTED' });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reject order.');
    }
  };

 useEffect(() => {
 fetchOrders();
 const interval = setInterval(() => fetchOrders(true), 5000); // Poll every 5s for new orders
 return () => clearInterval(interval);
 }, []);

 const filteredOrders = orders.filter(order => {
    const matchesStatus = filter === 'ALL' || order.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      order.id.toLowerCase().includes(searchLower) || 
      (order.customer_name && order.customer_name.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
 });

 const getStatusColor = (status) => {
 switch (status) {
 case 'NEW': return 'bg-indigo-100 text-indigo-700 ';
 case 'ACCEPTED': return 'bg-blue-100 text-blue-700';
 case 'PREPARING': return 'bg-amber-100 text-amber-700';
 case 'READY': return 'bg-emerald-100 text-emerald-700';
 case 'COMPLETED': return 'bg-slate-100 text-slate-700 ';
 case 'REJECTED': return 'bg-rose-100 text-rose-700';
 default: return 'bg-slate-100 text-slate-700 ';
 }
 };

 return (
 <div className="max-w-7xl mx-auto space-y-6">
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
 <p className="text-sm text-gray-500 mt-1">Manage and pack customer orders</p>
 </div>
 <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
   <div className="relative">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
     <input 
       type="text" 
       placeholder="Search by ID or Name..." 
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm w-full sm:w-64 transition-all shadow-sm"
     />
   </div>
   <button onClick={fetchOrders} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition whitespace-nowrap">
   Refresh
   </button>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
 {['ALL', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED'].map(status => (
 <button
 key={status}
 onClick={() => setFilter(status)}
 className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
 filter === status ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 '
 }`}
 >
 {status}
 {status !== 'ALL' && status !== 'COMPLETED' && status !== 'REJECTED' && (
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${filter === status ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600 '}`}>
 {orders.filter(o => o.status === status).length}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* Orders List */}
 <div className="space-y-4">
 {loading && orders.length === 0 ? (
 <div className="space-y-4">
   {[1, 2, 3].map(i => (
     <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
       <div className="flex items-start sm:items-center gap-4 w-full">
         <div className="w-12 h-12 bg-slate-200 rounded-xl flex-shrink-0"></div>
         <div className="space-y-2 w-full">
           <div className="h-5 bg-slate-200 rounded w-1/3"></div>
           <div className="h-4 bg-slate-200 rounded w-1/2"></div>
         </div>
       </div>
       <div className="w-full sm:w-32 h-10 bg-slate-200 rounded-xl flex-shrink-0"></div>
     </div>
   ))}
 </div>
 ) : filteredOrders.length === 0 ? (
 <div className="py-16 px-4 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-200">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
 <ShoppingBag className="w-8 h-8 text-slate-400"/>
 </div>
 <h3 className="text-lg font-bold text-slate-900">No orders found</h3>
 <p className="text-slate-500 mt-1 font-medium">There are no orders matching this status.</p>
 </div>
 ) : (
 filteredOrders.map((order) => (
 <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
 <div className="flex items-start sm:items-center gap-4">
 <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${getStatusColor(order.status).replace('text-', 'text-opacity-0 bg-opacity-20 ')}`}>
 <Package className={`w-6 h-6 ${getStatusColor(order.status).split(' ')[1]}`} />
 </div>
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="font-extrabold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">{order.id}</span>
 <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-md ${getStatusColor(order.status)}`}>
 {order.status}
 </span>
 </div>
 <div className="text-sm text-slate-600 font-medium flex flex-wrap gap-x-3 gap-y-1">
 <span className="text-slate-900 font-bold">{order.customer_name || `User: ${order.customer}`}</span>
 <span className="text-slate-300">•</span>
 <span>{order.items?.length || 0} items</span>
 <span className="text-slate-300">•</span>
 <span className="font-extrabold text-slate-900">₹{order.total_amount}</span>
 </div>
 <div className="text-xs text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
 <Clock className="w-3.5 h-3.5"/>
 Ordered {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
 {order.pickup_time && <><span className="mx-1">•</span> Pickup: {order.pickup_time}</>}
 </div>
 </div>
 </div>
 
 <div className="flex items-center gap-2 w-full sm:w-auto">
 {order.status === 'NEW' && (
 <button 
 onClick={() => rejectOrder(order.id)}
 className="w-full sm:w-auto text-center px-4 py-2.5 bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 font-bold transition-colors whitespace-nowrap"
 >
 Reject
 </button>
 )}
 <Link 
 to={`/owner/orders/${order.id}/invoice`}
 target="_blank"
 rel="noopener noreferrer"
 title="Print / View Invoice"
 className="hidden sm:inline-flex items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors border border-slate-200 shadow-sm"
 >
 <Printer className="w-4 h-4" />
 </Link>
 <Link 
 to={`/owner/orders/${order.id}`}
 className="w-full sm:w-auto text-center px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-600 hover:text-white font-bold transition-colors whitespace-nowrap"
 >
 Manage Order
 </Link>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
};

export default Orders;
