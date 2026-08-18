import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import api from '../../services/api';

export default function OrdersHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/').then(res => setOrders(res.data.results || res.data)).finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'READY': return 'bg-primary-50 text-primary-700 border-primary-200';
      case 'PREPARING': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Order History</h2>
            <p className="text-sm text-slate-500 mt-1">Track and review your past purchases.</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-2xl"></div>)}
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center text-primary-300 mb-6 shadow-inner">
            <Package size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No orders yet</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">It looks like you haven't placed any orders yet. Once you make a purchase, it will appear here so you can track its status.</p>
          <Link to="/products" className="bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-2">
            Start Shopping <ChevronRight size={18} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`} className="group block bg-white rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-primary-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-extrabold text-lg text-slate-900 group-hover:text-primary-700 transition-colors">{order.id}</span>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-lg border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between items-end border-t border-slate-100 pt-4 mt-2">
                <p className="text-sm font-medium text-slate-600">{order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}</p>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                  <p className="font-black text-xl text-slate-900">₹{parseFloat(order.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
