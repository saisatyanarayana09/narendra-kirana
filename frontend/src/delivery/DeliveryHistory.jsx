import React, { useState, useEffect } from 'react';
import { CheckCircle2, MapPin, IndianRupee, Clock, Package, Search, Calendar, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function DeliveryHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/delivery/history/')
      .then(res => setOrders(res.data || []))
      .catch(err => console.error("Error loading history:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
    (o.delivery_address && o.delivery_address.toLowerCase().includes(search.toLowerCase()))
  );

  const totalEarnings = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading trip logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white">Trip History & Fulfillment</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Your record of successfully completed grocery deliveries</p>
      </div>

      {/* Summary KPI Banner - Full Width */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Trips</p>
            <p className="text-2xl font-black text-white">{orders.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Orders Delivered</p>
            <p className="text-2xl font-black text-white">{orders.length} pkgs</p>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fulfilled Value</p>
            <p className="text-2xl font-black text-white">
              ₹{orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      {orders.length > 0 && (
        <div className="flex items-center gap-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 shadow-xs">
          <div className="pl-2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search completed trips by Order #, Customer, or Address..."
            className="w-full bg-transparent pr-4 text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
          />
        </div>
      )}

      {/* Orders List - Full Width Responsive Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 px-6 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3.5">
            <CheckCircle2 size={32} />
          </div>
          <h4 className="text-base font-bold text-slate-200">No trips to display</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search ? 'No completed trips match your search term.' : 'Completed trips and fulfilled customer orders will be saved here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => (
            <div 
              key={order.id} 
              className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-white">#{order.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                    Delivered ✅
                  </span>
                </div>

                <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${
                  order.payment_method === 'COD' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {order.payment_method === 'COD' ? `COD: ₹${order.total_amount}` : `Online: ₹${order.total_amount}`}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-100 text-sm">{order.customer_name || 'Customer'}</p>
                <div className="flex items-start gap-1.5 text-slate-400">
                  <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{order.delivery_address || 'Address'}</span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-500" />
                  <span>
                    Delivered: {order.delivered_at 
                      ? new Date(order.delivered_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : new Date(order.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <span className="text-slate-400 font-medium">
                  {order.items?.length || 0} items
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
