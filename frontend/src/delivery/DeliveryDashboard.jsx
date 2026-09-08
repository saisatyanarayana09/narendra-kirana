import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Truck, Phone, MapPin, Navigation, CheckCircle2, 
  Package, IndianRupee, Clock, ChevronDown, ChevronUp, 
  ShieldCheck, AlertCircle, RefreshCw, X 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function DeliveryDashboard() {
  const { isOnline, handleToggleDuty, togglingDuty } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // OTP Modal State
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get('/delivery/dashboard/');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      toast.error('Failed to update orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-poll active orders every 20 seconds
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. Action: Pickup from Store
  const handlePickup = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId]: 'pickup' }));
    try {
      await api.post(`/delivery/orders/${orderId}/pickup/`);
      toast.success(`Order #${orderId} marked as Out for Delivery! 🛵`);
      fetchDashboard(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to pickup order.');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  // 2. Action: Open OTP Modal
  const openOtpModal = (order) => {
    setOtpModalOrder(order);
    setOtpValue('');
    setOtpError('');
  };

  // 3. Action: Submit OTP to Complete
  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!otpModalOrder) return;
    if (!otpValue.trim()) {
      setOtpError('Please enter the 4-digit OTP provided by the customer.');
      return;
    }

    setSubmittingOtp(true);
    setOtpError('');

    try {
      await api.post(`/delivery/orders/${otpModalOrder.id}/complete/`, {
        otp: otpValue.trim()
      });
      toast.success(`Order #${otpModalOrder.id} Delivered Successfully! 🎉`);
      setOtpModalOrder(null);
      setOtpValue('');
      fetchDashboard(true);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP code. Please verify with customer.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  const activeOrders = dashboardData?.active_orders || [];
  const completedTodayCount = dashboardData?.completed_today_count || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading delivery dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertCircle size={22} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-bold">You are currently OFFLINE</p>
              <p className="text-[11px] text-amber-200/80">Turn on your duty switch to receive new delivery orders.</p>
            </div>
          </div>
          <button
            onClick={handleToggleDuty}
            disabled={togglingDuty}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
          >
            Go Online
          </button>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tasks</p>
            <p className="text-xl sm:text-2xl font-black text-white">{activeOrders.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivered Today</p>
            <p className="text-xl sm:text-2xl font-black text-white">{completedTodayCount}</p>
          </div>
        </div>
      </div>

      {/* Section Header with Refresh */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-white">Current Delivery Tasks</h2>
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <button
          onClick={() => fetchDashboard(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-bold transition cursor-pointer"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Orders List */}
      {activeOrders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mb-3">
            <Package size={32} />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-200">No active deliveries</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {isOnline 
              ? "You are online and ready! As soon as the store assigns an order to you, it will appear here." 
              : "Switch on your duty to start receiving delivery assignments."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const isReadyForPickup = order.status === 'READY';
            const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
            const mapsUrl = order.delivery_latitude && order.delivery_longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address || 'Narendra Kirana')}`;

            return (
              <div 
                key={order.id} 
                className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl transition-all"
              >
                {/* Order Top Bar */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm sm:text-base font-black text-white">
                      #{order.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      isOutForDelivery
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {isOutForDelivery ? 'Out for Delivery 🛵' : 'Ready at Store 📦'}
                    </span>
                  </div>

                  {/* Payment Pill */}
                  <div className="text-right">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                      order.payment_method === 'COD'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {order.payment_method === 'COD' ? `COD: Collect ₹${order.total_amount}` : 'PREPAID ₹0'}
                    </span>
                  </div>
                </div>

                {/* Customer Details & Quick Navigation */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Customer</p>
                      <p className="text-sm font-black text-slate-100">{order.customer_name || 'Customer'}</p>
                    </div>

                    {order.customer_phone && (
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      >
                        <Phone size={14} />
                        <span>Call Customer</span>
                      </a>
                    )}
                  </div>

                  {/* Address + Maps Navigation */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <MapPin size={16} className="text-rose-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 leading-relaxed break-words">
                          {order.delivery_address || "Store delivery address"}
                        </p>
                        {order.delivery_pincode && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Pincode: {order.delivery_pincode}</p>
                        )}
                      </div>
                    </div>

                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
                    >
                      <Navigation size={13} />
                      <span>Map</span>
                    </a>
                  </div>

                  {/* Delivery Slot info if present */}
                  {order.delivery_slot_label && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock size={13} className="text-slate-500" />
                      <span>Slot: <strong className="text-slate-300">{order.delivery_slot_label}</strong> ({order.delivery_slot_date || 'Today'})</span>
                    </div>
                  )}
                </div>

                {/* Expandable Order Items Checklist */}
                <div className="mb-4 pt-2 border-t border-slate-800/60">
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
                  >
                    <span>Items to Deliver ({order.items?.length || 0} items)</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-300 font-medium">
                            {item.product_name_snapshot} × {item.quantity} {item.unit_snapshot}
                          </span>
                          <span className="text-slate-400 font-bold">₹{item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                {isReadyForPickup && (
                  <button
                    onClick={() => handlePickup(order.id)}
                    disabled={actionLoading[order.id] === 'pickup'}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading[order.id] === 'pickup' ? (
                      <span>Updating pickup...</span>
                    ) : (
                      <>
                        <Package size={18} />
                        <span>Picked Up from Store (Start Delivery)</span>
                      </>
                    )}
                  </button>
                )}

                {isOutForDelivery && (
                  <button
                    onClick={() => openOtpModal(order)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition active:scale-98 cursor-pointer"
                  >
                    <ShieldCheck size={18} />
                    <span>Enter Customer OTP & Deliver</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OTP Modal */}
      {otpModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
            <button
              onClick={() => setOtpModalOrder(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-5">
              <div className="size-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-lg font-black">Verify Customer OTP</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ask <strong>{otpModalOrder.customer_name}</strong> for the 4-digit OTP displayed on their Narendra Kirana order screen.
              </p>
            </div>

            {otpError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteOrder} className="space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit OTP"
                  autoFocus
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl py-3.5 text-center text-2xl font-mono tracking-widest text-white outline-none focus:ring-4 focus:ring-emerald-500/20"
                />
              </div>

              {otpModalOrder.payment_method === 'COD' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold text-center">
                  💵 Please collect ₹{otpModalOrder.total_amount} in Cash
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOtp || !otpValue}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {submittingOtp ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm & Complete Delivery</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
