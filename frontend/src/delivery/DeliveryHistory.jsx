import React, { useState, useEffect } from 'react';
import { CheckCircle2, Calendar, MapPin, IndianRupee, Clock, Package } from 'lucide-react';
import api from '../services/api';

export default function DeliveryHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/delivery/history/')
      .then(res => setOrders(res.data || []))
      .catch(err => console.error("Error loading history:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading delivery history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-black text-white">Completed Trips History</h2>
        <p className="text-xs text-slate-400">Your recent delivered orders and fulfillment records</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mb-3">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-base font-bold text-slate-200">No completed trips yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Orders you deliver will be logged here with timestamps and payment summaries.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-black text-white">#{order.id}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black uppercase">
                  Delivered
                </span>
              </div>

              <div className="text-xs text-slate-300">
                <p className="font-bold text-white">{order.customer_name || 'Customer'}</p>
                <div className="flex items-start gap-1.5 text-slate-400 mt-1">
                  <MapPin size={14} className="text-slate-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{order.delivery_address || 'Address'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-500" />
                  <span>
                    {order.delivered_at 
                      ? new Date(order.delivered_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : new Date(order.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="font-bold text-emerald-400">
                  {order.payment_method === 'COD' ? `COD ₹${order.total_amount}` : `Paid Online (₹${order.total_amount})`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
