import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ShoppingBag, Search, Clock, CheckCircle, Package, Printer, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import InvoiceModal from '../components/InvoiceModal';
import { useWebSocket } from '../../hooks/useWebSocket';

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

  const handleWsMessage = useCallback((data) => {
    if (!data || !data.type) return;
    if (data.type === 'NEW_ORDER') {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {});
      } catch {}
      toast.success(`New Order #${data.order?.id} received`, { duration: 6000 });
      fetchOrders(true);
    } else if (data.type === 'ORDER_STATUS_CHANGED') {
      fetchOrders(true);
    }
  }, []);

  const { isConnected: isWsConnected } = useWebSocket({
    path: '/ws/owner/orders/',
    onMessage: handleWsMessage,
  });

  useEffect(() => {
    fetchOrders();
    const pollTime = isWsConnected ? 30000 : 8000;
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, pollTime);
    return () => clearInterval(interval);
  }, [isWsConnected]);

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
        return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/50' };
      case 'ACCEPTED':
        return { badge: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' };
      case 'PREPARING':
        return { badge: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50' };
      case 'READY':
        return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50' };
      case 'COMPLETED':
        return { badge: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' };
      case 'REJECTED':
        return { badge: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50' };
      default:
        return { badge: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' };
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Orders</h1>
            {isWsConnected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and fulfill customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search orders..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 text-sm text-slate-900 dark:text-white placeholder-slate-400 w-full sm:w-64 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => fetchOrders(false)} 
            className="px-4 py-2 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium shadow-sm transition whitespace-nowrap"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
        {['ALL', 'NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              filter === status 
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {status}
            {status !== 'ALL' && status !== 'COMPLETED' && status !== 'REJECTED' && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                filter === status 
                  ? 'bg-slate-700 text-slate-100 dark:bg-slate-200 dark:text-slate-800' 
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {orders.filter(o => o.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4 w-full">
                   <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-24"></div>
                   <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">No orders found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">There are no orders matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="font-medium px-4 py-3">Order ID</th>
                  <th className="font-medium px-4 py-3">Customer</th>
                  <th className="font-medium px-4 py-3">Status</th>
                  <th className="font-medium px-4 py-3">Amount</th>
                  <th className="font-medium px-4 py-3">Date & Time</th>
                  <th className="font-medium px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredOrders.map((order) => {
                  const styles = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-4 py-3">
                        <Link to={`/owner/orders/${order.id}`} className="font-medium text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                          {order.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {order.customer_name || `User: ${order.customer}`}
                        <span className="text-slate-400 dark:text-slate-500 ml-2 text-xs">{order.items?.length || 0} items</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles.badge}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-white">₹{order.total_amount}</span>
                        {order.payment_method === 'UPI' && (
                          <span className="ml-2 text-[10px] font-medium text-slate-500 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded">UPI</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                        <div className="text-slate-400 dark:text-slate-500 text-[11px]">
                          {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          {order.pickup_time && <span className="ml-1 text-slate-400">({order.pickup_time})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {order.status === 'NEW' && (
                          <button 
                            onClick={() => setOrderToReject(order)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 mr-2"
                          >
                            Reject
                          </button>
                        )}
                        <button 
                          onClick={() => setSelectedInvoiceOrderId(order.id)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md align-middle mr-1"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4 inline" />
                        </button>
                        <Link 
                          to={`/owner/orders/${order.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors align-middle"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {orderToReject && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-xl w-full max-w-md p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <AlertTriangle size={20} />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Reject Order?</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to reject Order <strong className="text-slate-900 dark:text-white">#{orderToReject.id}</strong> for <strong className="text-slate-900 dark:text-white">{orderToReject.customer_name || 'Customer'}</strong> (₹{orderToReject.total_amount})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOrderToReject(null)}
                disabled={isRejecting}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejectOrder}
                disabled={isRejecting}
                className="px-4 py-2 text-white font-medium bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {isRejecting ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
