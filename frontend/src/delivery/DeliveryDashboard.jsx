import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Truck, Phone, MapPin, Navigation, CheckCircle2, 
  Package, Clock, ChevronDown, ChevronUp, 
  ShieldCheck, AlertCircle, RefreshCw, X, ArrowUpRight,
  Sparkles, Banknote, ShieldAlert, Check, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function DeliveryDashboard() {
  const { fetchStatus } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [notifiedArrival, setNotifiedArrival] = useState({});
  const [notifyingArrival, setNotifyingArrival] = useState({});

  // 4-Digit Split OTP Modal State
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const fetchDashboard = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get('/delivery/dashboard/');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      if (!silent) toast.error('Failed to sync delivery dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-poll active orders every 12 seconds
    const interval = setInterval(() => {
      fetchDashboard(true);
      fetchStatus?.();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id) => {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Action: Pickup from Store
  const handlePickup = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId]: 'pickup' }));
    try {
      await api.post(`/delivery/orders/${orderId}/pickup/`);
      toast.success(`Order #${orderId} marked Out for Delivery! 🛵`);
      fetchDashboard(true);
      fetchStatus?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to pickup order.');
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  // Open OTP Verification Modal
  const openOtpModal = (order) => {
    setOtpModalOrder(order);
    setOtpDigits(['', '', '', '']);
    setOtpError('');
    setTimeout(() => {
      inputRefs[0]?.current?.focus();
    }, 100);
  };

  // Handle individual OTP digit change with auto-advance
  const handleOtpDigitChange = (index, value) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setOtpError('');

    if (char && index < 3) {
      inputRefs[index + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    if (pasted.length === 4) {
      inputRefs[3]?.current?.focus();
    } else {
      inputRefs[pasted.length]?.current?.focus();
    }
  };

  // Submit OTP to Complete Delivery
  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!otpModalOrder) return;
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length !== 4) {
      setOtpError('Please enter the full 4-digit OTP provided by the customer.');
      return;
    }

    setSubmittingOtp(true);
    setOtpError('');

    try {
      await api.post(`/delivery/orders/${otpModalOrder.id}/complete/`, {
        otp: enteredOtp
      });
      toast.success(`Order #${otpModalOrder.id} Delivered Successfully! 🎉`, { duration: 4000 });
      setOtpModalOrder(null);
      setOtpDigits(['', '', '', '']);
      fetchDashboard(true);
      fetchStatus?.();
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid OTP code. Please ask customer to confirm the code.');
    } finally {
      setSubmittingOtp(false);
    }
  };

  const handleNotifyArrival = async (orderId) => {
    setNotifyingArrival(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.post(`/delivery/orders/${orderId}/notify-arrival/`);
      setNotifiedArrival(prev => ({ ...prev, [orderId]: true }));
      toast.success("Customer notified: You are 2 minutes away! 🛵", { duration: 3500 });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not notify customer. Please try again.");
    } finally {
      setNotifyingArrival(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const activeOrders = dashboardData?.active_orders || [];
  const completedTodayCount = dashboardData?.completed_today_count || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading delivery tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Store Logistics Hub Header */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/30 shadow-xl shadow-black/40">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-13 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Truck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">Narendra Kirana Partner Fleet</h2>
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Ready for store assignments. Orders dispatched to you will appear below in real time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboard(false)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Deliveries'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Shift Metrics - 3 Clean Full-Width Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Trips</p>
            <p className="text-2xl font-black text-white">{activeOrders.length}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivered Today</p>
            <p className="text-2xl font-black text-white">{completedTodayCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md flex items-center gap-3.5 backdrop-blur-md">
          <div className="size-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Banknote size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Value</p>
            <p className="text-2xl font-black text-white">
              ₹{activeOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tasks Section Header */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-black text-white">Active Delivery Orders</h3>
          {activeOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30">
              {activeOrders.length}
            </span>
          )}
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

      {/* Empty State */}
      {activeOrders.length === 0 ? (
        <div className="text-center py-16 px-6 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center">
          <div className="size-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3.5 shadow-inner">
            <Truck size={32} />
          </div>
          <h4 className="text-base font-bold text-slate-200">No active delivery assignments</h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            When the store assigns orders for pickup and customer delivery, they will appear right here in real time.
          </p>
        </div>
      ) : (
        /* Zepto / Swiggy style Order Cards - Full Width Responsive Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
          {activeOrders.map((order) => {
            const isExpanded = Boolean(expandedOrders[order.id]);
            const isReadyForPickup = order.status === 'READY';
            const isOutForDelivery = order.status === 'OUT_FOR_DELIVERY';
            const isCod = order.payment_method === 'COD';

            const mapsUrl = order.delivery_latitude && order.delivery_longitude
              ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.delivery_address || 'Narendra Kirana Store')}`;

            return (
              <div 
                key={order.id} 
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/40 space-y-4 transition-all"
              >
                {/* Header: Order ID & Status Pill */}
                <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base sm:text-lg font-black text-white">
                        #{order.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                        isOutForDelivery
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {isOutForDelivery ? 'Out for Delivery 🛵' : 'Ready at Store 📦'}
                      </span>
                    </div>

                    {order.delivery_slot_label && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Clock size={13} className="text-slate-500" />
                        <span>Slot: <strong className="text-slate-200">{order.delivery_slot_label}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Payment Badge */}
                  <div className="text-right">
                    <span className={`inline-block text-xs sm:text-sm font-black px-3 py-1.5 rounded-xl ${
                      isCod
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isCod ? `Collect Cash: ₹${order.total_amount}` : 'PREPAID ₹0'}
                    </span>
                  </div>
                </div>

                {/* Big Payment Instruction Banner */}
                {isCod ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center gap-3 text-amber-200">
                    <Banknote size={24} className="text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="block font-black uppercase tracking-wider text-amber-300">
                        Cash on Delivery Order
                      </strong>
                      <span>Please collect exactly <strong className="text-white font-bold">₹{order.total_amount}</strong> from customer upon delivery.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 flex items-center gap-3 text-emerald-200">
                    <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
                    <div className="text-xs">
                      <strong className="block font-black uppercase tracking-wider text-emerald-300">
                        Prepaid Order (Paid Online)
                      </strong>
                      <span>Do NOT collect any money. Order is already paid in full.</span>
                    </div>
                  </div>
                )}

                {/* Customer Contact & Call Action */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                    <p className="text-sm sm:text-base font-black text-white">{order.customer_name || 'Customer'}</p>
                    {order.customer_phone && (
                      <p className="text-xs text-slate-400 mt-0.5">{order.customer_phone}</p>
                    )}
                  </div>

                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer shrink-0"
                    >
                      <Phone size={15} />
                      <span>Call Customer</span>
                    </a>
                  )}
                </div>

                {/* Delivery Location & 1-Click GPS Navigation */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivery Address</p>
                      <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed break-words mt-0.5">
                        {order.delivery_address || 'No street address specified.'}
                      </p>
                      {order.delivery_pincode && (
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                          Pincode: {order.delivery_pincode}
                        </span>
                      )}
                    </div>
                  </div>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer"
                  >
                    <Navigation size={16} />
                    <span>Open in Google Maps Navigation</span>
                    <ArrowUpRight size={14} className="opacity-70" />
                  </a>
                </div>

                {/* Order Checklist */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer"
                  >
                    <span>Package Items ({order.items?.length || 0} items)</span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 space-y-1.5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/70 text-xs">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-300 font-medium">
                            {item.product_name_snapshot} × {item.quantity} {item.unit_snapshot}
                          </span>
                          <span className="text-slate-400 font-bold font-mono">₹{item.subtotal}</span>
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
                    className="w-full py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading[order.id] === 'pickup' ? (
                      <span>Updating pickup...</span>
                    ) : (
                      <>
                        <Package size={20} />
                        <span>Picked Up from Store • Start Delivery</span>
                      </>
                    )}
                  </button>
                )}

                {isOutForDelivery && (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => handleNotifyArrival(order.id)}
                      disabled={notifyingArrival[order.id] || notifiedArrival[order.id]}
                      className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border transition cursor-pointer active:scale-98 ${
                        notifiedArrival[order.id]
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 hover:bg-slate-750 text-amber-400 border-slate-700 hover:border-amber-500/40'
                      }`}
                    >
                      <Bell size={16} className={notifyingArrival[order.id] ? 'animate-bounce' : ''} />
                      <span>
                        {notifyingArrival[order.id]
                          ? 'Sending Alert to Customer...'
                          : notifiedArrival[order.id]
                          ? 'Arrival Alert Sent (2 Mins Away) ✓'
                          : 'Notify Customer: Rider is 2 Minutes Away 🛵'}
                      </span>
                    </button>

                    <button
                      onClick={() => openOtpModal(order)}
                      className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/30 transition active:scale-98 cursor-pointer"
                    >
                      <ShieldCheck size={22} />
                      <span>Enter Customer OTP & Handover</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modern 4-Digit Split PIN OTP Verification Modal */}
      {otpModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 text-white">
            
            <button
              onClick={() => setOtpModalOrder(null)}
              className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-emerald-500/10">
                <ShieldCheck size={32} />
              </div>
              <h4 className="text-xl font-black">Customer OTP Verification</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Ask <strong>{otpModalOrder.customer_name}</strong> for the 4-digit OTP shown on their Narendra Kirana order screen.
              </p>
            </div>

            {otpError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle size={16} className="shrink-0" />
                <span>{otpError}</span>
              </div>
            )}

            <form onSubmit={handleCompleteOrder} className="space-y-5">
              {/* 4 Separate PIN Digits Box */}
              <div className="flex justify-center gap-3">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="size-14 bg-slate-950 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl text-center text-2xl font-mono font-black text-white outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all"
                  />
                ))}
              </div>

              {otpModalOrder.payment_method === 'COD' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold text-center">
                  💵 Please collect ₹{otpModalOrder.total_amount} in Cash before completing
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOtp || otpDigits.join('').length !== 4}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingOtp ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <Check size={20} className="stroke-[3]" />
                    <span>Verify OTP & Complete Delivery</span>
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
