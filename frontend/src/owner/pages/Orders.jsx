import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ShoppingBag, Search, Clock, CheckCircle, Package, Printer, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import InvoiceModal from '../components/InvoiceModal';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, NEW, PREPARING, READY, COMPLETED
  const [searchTerm, setSearchTerm] = useState('');
  const [orderToReject, setOrderToReject] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedInvoiceOrderId, setSelectedInvoiceOrderId] = useState(null);

  const fetchOrders = async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const response = await api.get('/orders/', { params: { t: Date.now() } });
      setOrders(response.data.results || response.data);
    } catch (err) {
      console.error(err);
      if (!isPoll) toast.error('Failed to fetch orders.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  };

  const confirmRejectOrder = async () => {
    if (!orderToReject) return;
    setIsRejecting(true);
    try {
      await api.patch(`/orders/${orderToReject.id}/status/`, { status: 'REJECTED' });
      toast.success(`Order #${orderToReject.id} has been rejected.`);
      setOrderToReject(null);
      fetchOrders(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject order.');
    } finally {
      setIsRejecting(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, 5000); // Poll every 5s for new orders when tab is visible
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return {
          badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
        };
      case 'ACCEPTED':
        return {
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
          iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
        };
      case 'PREPARING':
        return {
          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
          iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
        };
      case 'READY':
        return {
          badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
        };
      case 'COMPLETED':
        return {
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          iconBg: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
        };
      case 'REJECTED':
        return {
          badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
          iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          iconBg: 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage, fulfill and pack customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by ID or Name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-full sm:w-64 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => fetchOrders(false)} 
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium shadow-sm transition whitespace-nowrap"
          >
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
              filter === status 
                ? 'bg-slate-900 text-white shadow-md dark:bg-indigo-600 dark:text-white' 
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {status}
            {status !== 'ALL' && status !== 'COMPLETED' && status !== 'REJECTED' && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                filter === status 
                  ? 'bg-white text-slate-900 dark:bg-indigo-800 dark:text-indigo-100' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
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
              <div key={i} className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                <div className="flex items-start sm:items-center gap-4 w-full">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex-shrink-0"></div>
                  <div className="space-y-2 w-full">
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="w-full sm:w-32 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl flex-shrink-0"></div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center bg-white dark:bg-[#0d1322] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-400"/>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No orders found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">There are no orders matching this status.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const styles = getStatusBadge(order.status);
            return (
              <div key={order.id} className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${styles.iconBg}`}>
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {order.id}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-md ${styles.badge}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 font-medium flex flex-wrap gap-x-3 gap-y-1">
                      <span className="text-slate-900 dark:text-white font-bold">{order.customer_name || `User: ${order.customer}`}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span>{order.items?.length || 0} items</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">₹{order.total_amount}</span>
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5"/>
                      Ordered {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                      {order.pickup_time && <><span className="mx-1">•</span> Pickup: {order.pickup_time}</>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {order.status === 'NEW' && (
                    <button 
                      type="button"
                      onClick={() => setOrderToReject(order)}
                      className="w-full sm:w-auto text-center px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:text-rose-300 rounded-xl font-bold transition-colors whitespace-nowrap text-sm"
                    >
                      Reject
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setSelectedInvoiceOrderId(order.id)}
                    title="View / Print Tax Invoice"
                    aria-label={`View invoice for order ${order.id}`}
                    className="inline-flex items-center justify-center p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <Link 
                    to={`/owner/orders/${order.id}`}
                    className="w-full sm:w-auto text-center px-6 py-2.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/50 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white rounded-xl font-bold transition-colors whitespace-nowrap text-sm"
                  >
                    Manage Order
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal: Reject Order */}
      {orderToReject && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Reject Order?</h2>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to reject Order <strong className="text-slate-900 dark:text-white">#{orderToReject.id}</strong> for <strong className="text-slate-900 dark:text-white">{orderToReject.customer_name || 'Customer'}</strong> (₹{orderToReject.total_amount})? This will cancel the order and update the order status to REJECTED.
            </p>

            <div className="pt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejectOrder}
                disabled={isRejecting}
                className="px-4 py-2 text-white font-bold bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {isRejecting ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tax Invoice Modal Popup */}
      {selectedInvoiceOrderId && (
        <InvoiceModal
          orderId={selectedInvoiceOrderId}
          onClose={() => setSelectedInvoiceOrderId(null)}
        />
      )}
    </div>
  );
};

export default Orders;
