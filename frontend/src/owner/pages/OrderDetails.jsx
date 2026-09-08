import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, CheckCircle, Package, Clock, XCircle, ChevronRight, 
  Printer, MapPin, Phone, AlertTriangle, X, Loader2, Truck, Key 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import InvoiceModal from '../components/InvoiceModal';

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
  const [gettingLocation, setGettingLocation] = useState(false);

  // Delivery Partner State
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assigningPartner, setAssigningPartner] = useState(false);

  // In-app Confirmation Modals
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchOrder = useCallback(async (isPoll = false) => {
    try {
      if (!isPoll) setLoading(true);
      const response = await api.get(`/orders/${id}/`, { params: { t: Date.now() } });
      setOrder(response.data);
      if (!isPoll) {
        setOwnerNote(response.data.owner_note || '');
        if (response.data.delivery_partner) {
          setSelectedPartnerId(String(response.data.delivery_partner));
        }
      }
    } catch (err) {
      console.error(err);
      if (!isPoll) setError('Failed to fetch order details.');
    } finally {
      if (!isPoll) setLoading(false);
    }
  }, [id]);

  // Load registered delivery partners for assignment
  useEffect(() => {
    api.get('/delivery/partners/')
      .then(res => setDeliveryPartners(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrder(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const updateStatus = async (newStatus) => {
    setIsUpdating(true);
    try {
      await api.patch(`/orders/${id}/status/`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      setIsRejectModalOpen(false);
      fetchOrder();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to update order status.');
    } finally {
      setIsUpdating(false);
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
      toast.success('Note saved successfully');
      fetchOrder();
    } catch (err) {
      toast.error('Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  const confirmRejectItem = async () => {
    if (!rejectingItem) return;
    setIsUpdating(true);
    try {
      const res = await api.post(`/orders/${id}/reject_item/`, { item_id: rejectingItem.id });
      setOrder(res.data);
      toast.success(`Rejected "${rejectingItem.product_name_snapshot}"`);
      setRejectingItem(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reject item');
    } finally {
      setIsUpdating(false);
    }
  };

 const handleGetDirections = (e) => {
   e.preventDefault();
   const destination = `${order.delivery_latitude},${order.delivery_longitude}`;
   if (!navigator.geolocation) {
     window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
     return;
   }

   setGettingLocation(true);
   navigator.geolocation.getCurrentPosition(
     (position) => {
       setGettingLocation(false);
       const origin = `${position.coords.latitude},${position.coords.longitude}`;
       window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank');
     },
     (error) => {
       setGettingLocation(false);
       console.warn("Location error:", error);
       window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
     },
     { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
   );
 };

  const handleAssignPartner = async () => {
    setAssigningPartner(true);
    try {
      await api.post(`/orders/${id}/assign_partner/`, {
        delivery_partner_id: selectedPartnerId ? parseInt(selectedPartnerId) : null
      });
      toast.success(selectedPartnerId ? 'Delivery partner assigned! 🛵' : 'Delivery partner unassigned.');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign partner.');
    } finally {
      setAssigningPartner(false);
    }
  };


  if (loading && !order) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400 font-medium">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-4">
        <p className="text-rose-600 dark:text-rose-400 font-bold">{error || 'Order not found.'}</p>
        <Link to="/owner/orders" className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-sm font-bold">
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  const activeItems = order.items.filter(item => item.status !== 'REJECTED');
  const allPacked = activeItems.length > 0 && activeItems.every(item => packedItems[item.id]);

  const getStatusBanner = () => {
    switch (order.status) {
      case 'NEW':
        return { bg: 'bg-gradient-to-r from-indigo-600 to-blue-600', text: 'New Order Received', msg: 'Review items and accept or reject the order.', icon: Clock };
      case 'ACCEPTED':
        return { bg: 'bg-gradient-to-r from-blue-600 to-cyan-600', text: 'Order Accepted', msg: 'Begin gathering and packing the grocery items.', icon: Package };
      case 'PREPARING':
        return { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'Packing Order', msg: 'Check off items as you place them into bags.', icon: Clock };
      case 'READY':
        return { bg: 'bg-gradient-to-r from-emerald-600 to-teal-600', text: 'Ready for Handover', msg: order.order_type === 'DELIVERY' ? 'Ready for delivery dispatch.' : 'Waiting for customer pickup.', icon: CheckCircle };
      case 'OUT_FOR_DELIVERY':
        return { bg: 'bg-gradient-to-r from-amber-500 to-emerald-600', text: 'Out for Delivery 🛵', msg: `Order is with ${order.delivery_partner_name || 'delivery rider'}.`, icon: Truck };
      case 'COMPLETED':
        return { bg: 'bg-gradient-to-r from-slate-700 to-slate-800', text: 'Order Completed', msg: 'Delivered and payment settled.', icon: CheckCircle };
      case 'REJECTED':
        return { bg: 'bg-gradient-to-r from-rose-600 to-red-600', text: 'Order Rejected', msg: 'This order was declined by the store.', icon: XCircle };
      default:
        return { bg: 'bg-slate-800', text: order.status, msg: '', icon: Clock };
    }
  };

  const banner = getStatusBanner();
  const BannerIcon = banner.icon;

  // Render Action Buttons
  const renderActionButtons = (isMobileView = false) => {
    if (!['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.status)) return null;

    return (
      <div className={`bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 sm:p-6 transition-colors ${isMobileView ? 'block md:hidden' : 'hidden md:block'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {isMobileView ? 'Quick Action' : 'Next Step'}
          </h3>
          {isUpdating && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold">
              <Loader2 size={13} className="animate-spin" /> Updating...
            </span>
          )}
        </div>

        {order.status === 'NEW' && (
          <div className="flex flex-col sm:flex-row md:flex-col gap-3">
            <button 
              onClick={() => updateStatus('ACCEPTED')} 
              disabled={isUpdating} 
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 text-sm disabled:opacity-60"
            >
              Accept Order <ChevronRight size={16}/>
            </button>
            <button 
              onClick={() => setIsRejectModalOpen(true)} 
              disabled={isUpdating} 
              className="w-full py-3 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors text-sm border border-rose-200/80 dark:border-rose-800/80 disabled:opacity-60"
            >
              Reject Order
            </button>
          </div>
        )}

        {order.status === 'ACCEPTED' && (
          <button 
            onClick={() => updateStatus('PREPARING')} 
            disabled={isUpdating} 
            className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
          >
            <Package size={16}/> Start Packing Items
          </button>
        )}

        {order.status === 'PREPARING' && (
          <div className="space-y-2">
            <button 
              onClick={() => updateStatus('READY')} 
              disabled={isUpdating || !allPacked} 
              className={`w-full py-3.5 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm ${
                allPacked 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle size={16}/> Mark as Ready
            </button>
            {!allPacked && (
              <p className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium">
                Please check off all {activeItems.length} active items before marking ready.
              </p>
            )}
          </div>
        )}

        {order.status === 'READY' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium text-center bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {parseFloat(order.total_amount) > 0 ? (
                <>Collect <strong className="text-slate-900 dark:text-white font-black">₹{order.total_amount}</strong> {order.order_type === 'DELIVERY' ? 'via Cash on Delivery' : 'at store'}.</>
              ) : (
                <>Order fully paid via <strong className="text-emerald-600 dark:text-emerald-400 font-black">Wallet</strong>.</>
              )}
            </p>
            <button 
              onClick={() => updateStatus('COMPLETED')} 
              disabled={isUpdating} 
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60"
            >
              {parseFloat(order.total_amount) > 0 ? 'Payment Received & Handed Over' : 'Handover & Complete'}
            </button>
          </div>
        )}

        {order.status === 'OUT_FOR_DELIVERY' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium text-center bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
              Order is out for delivery with <strong className="text-slate-900 dark:text-white">{order.delivery_partner_name || 'Delivery Partner'}</strong>.
            </p>
            <button 
              onClick={() => updateStatus('COMPLETED')} 
              disabled={isUpdating} 
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-sm disabled:opacity-60 cursor-pointer"
            >
              <CheckCircle size={16} /> Mark as Delivered (Staff Override)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link 
          to="/owner/orders" 
          className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold text-sm"
        >
          <ArrowLeft size={16}/> Back to Orders
        </Link>
        <button 
          type="button"
          onClick={() => setIsInvoiceModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold shadow-sm transition-colors cursor-pointer"
          title="View & Print Tax Invoice"
        >
          <Printer size={14}/> Print Invoice
        </button>
      </div>

      {/* Status Banner */}
      <div className={`${banner.bg} rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl shrink-0">
            <BannerIcon className="w-8 h-8 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-black">{banner.text}</h1>
            <p className="text-white/90 text-sm mt-0.5">{banner.msg}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs text-white/80 uppercase tracking-wider font-bold">Order ID</p>
          <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">{order.id}</p>
        </div>
      </div>

      {/* Mobile Top Action Bar */}
      {renderActionButtons(true)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main 2-Column: Order Items & Notes */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-between items-center">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Order Items</h2>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {activeItems.length} active ({order.items.length} total)
              </span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items.map(item => {
                const isRejected = item.status === 'REJECTED';
                return (
                  <div 
                    key={item.id} 
                    className={`p-5 sm:p-6 flex items-center gap-4 transition-colors ${
                      order.status === 'PREPARING' && packedItems[item.id] 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                    onClick={() => order.status === 'PREPARING' && !isRejected && togglePacked(item.id)}
                  >
                    {/* Packing Checkbox (interactive during PREPARING) */}
                    {order.status === 'PREPARING' && (
                      <div className="flex-shrink-0 cursor-pointer">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          isRejected 
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800' 
                            : packedItems[item.id] 
                              ? 'bg-emerald-500 border-emerald-500 shadow-sm' 
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}>
                          {packedItems[item.id] && !isRejected && <CheckCircle className="w-5 h-5 text-white"/>}
                          {isRejected && <XCircle className="w-5 h-5 text-slate-400"/>}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-bold transition-all ${
                        isRejected 
                          ? 'text-slate-400 dark:text-slate-600 line-through' 
                          : packedItems[item.id] && order.status === 'PREPARING' 
                            ? 'text-emerald-800 dark:text-emerald-300 line-through opacity-70' 
                            : 'text-slate-900 dark:text-white'
                      }`}>
                        {item.product_name_snapshot}
                        {isRejected && (
                          <span className="ml-2 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md inline-block">
                            Rejected
                          </span>
                        )}
                      </h3>
                      <p className={`text-xs font-medium mt-0.5 ${isRejected ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                        {item.unit_snapshot} • ₹{item.price_snapshot} each
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end shrink-0">
                      <p className={`text-xl font-black ${isRejected ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-900 dark:text-white'}`}>
                        ×{item.quantity}
                      </p>
                      <p className={`text-sm font-bold mt-0.5 ${isRejected ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        ₹{item.subtotal}
                      </p>
                      
                      {!isRejected && ['NEW', 'ACCEPTED', 'PREPARING'].includes(order.status) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setRejectingItem(item); }}
                          className="mt-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-800 hover:bg-rose-600 dark:hover:bg-rose-600 px-2 py-0.5 rounded-lg transition-colors"
                        >
                          Reject Item
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Order Notes</h2>
            </div>
            <div className="p-6 space-y-4">
              {order.customer_note ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/60 rounded-xl">
                  <h3 className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5">Note from Customer</h3>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">{order.customer_note}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">No special instructions provided by customer.</p>
              )}
              
              <div className="pt-2">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Store Staff Note</h3>
                <textarea 
                  value={ownerNote} 
                  onChange={e => setOwnerNote(e.target.value)} 
                  placeholder="Write an internal fulfillment note (e.g., replacement offered)..."
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={saveNote}
                    disabled={savingNote}
                    className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Desktop Next Step & Summary Card */}
        <div className="space-y-6">
          {renderActionButtons(false)}

          {/* Customer & Delivery Summary Card */}
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 space-y-5 transition-colors">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Customer</h3>
              <p className="font-extrabold text-slate-900 dark:text-white text-base">
                {order.customer_name || `Customer #${order.customer}`}
              </p>
              {order.customer_phone && (
                <a 
                  href={`tel:${order.customer_phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                >
                  <Phone size={12} /> Call: {order.customer_phone}
                </a>
              )}
              {order.customer_email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{order.customer_email}</p>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                {order.order_type === 'DELIVERY' ? 'Delivery Slot' : 'Pickup Slot'}
              </h3>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {order.delivery_slot_label || order.pickup_time || 'Standard Fulfillment'}
              </p>
              {order.delivery_slot_date && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Date: {order.delivery_slot_date}</p>
              )}
            </div>

            {order.order_type === 'DELIVERY' && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 rounded-xl space-y-2">
                <h3 className="text-xs font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Package size={14} /> Delivery Address
                </h3>
                <p className="font-bold text-indigo-950 dark:text-indigo-200 whitespace-pre-line text-xs leading-relaxed">
                  {order.delivery_address || 'No street address provided.'}
                </p>
                {order.delivery_pincode && (
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">Pincode: {order.delivery_pincode}</p>
                )}
                
                {order.delivery_latitude && order.delivery_longitude && (
                  <button 
                    onClick={handleGetDirections}
                    disabled={gettingLocation}
                    className="mt-2 flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-xs disabled:opacity-60"
                  >
                    <MapPin className="w-3.5 h-3.5 mr-1.5" /> 
                    {gettingLocation ? 'Locating...' : 'Get GPS Directions'}
                  </button>
                )}
              </div>
            )}

            {/* Delivery Partner Assignment Card */}
            {order.order_type === 'DELIVERY' && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Truck size={14} /> Delivery Partner
                  </h3>
                  {order.delivery_otp && (
                    <span className="text-[11px] font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700">
                      OTP: {order.delivery_otp}
                    </span>
                  )}
                </div>

                {order.delivery_partner_name ? (
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Rider: <span className="text-emerald-600 dark:text-emerald-400">{order.delivery_partner_name}</span>
                    </p>
                    {order.delivery_partner_phone && (
                      <p className="text-slate-500 dark:text-slate-400">📞 {order.delivery_partner_phone}</p>
                    )}
                    {order.dispatched_at && (
                      <p className="text-[11px] text-slate-400">
                        Dispatched: {new Date(order.dispatched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    No delivery partner assigned yet.
                  </p>
                )}

                {/* Assignment Dropdown */}
                {['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
                  <div className="space-y-1.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Assign / Change Rider:
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white outline-none"
                      >
                        <option value="">-- Unassigned --</option>
                        {deliveryPartners.map((dp) => (
                          <option key={dp.id} value={dp.id}>
                            {dp.name} ({dp.is_online ? '🟢 Online' : '⚪ Offline'})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignPartner}
                        disabled={assigningPartner}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {assigningPartner ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Financials Breakdown */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="text-slate-900 dark:text-white font-bold">
                  ₹{activeItems.reduce((acc, item) => acc + parseFloat(item.subtotal), 0).toFixed(2)}
                </span>
              </div>
              {parseFloat(order.delivery_fee) > 0 && (
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">Delivery Fee</span>
                  <span className="text-slate-900 dark:text-white font-bold">₹{order.delivery_fee}</span>
                </div>
              )}
              {parseFloat(order.packaging_fee) > 0 && (
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">Packaging Fee</span>
                  <span className="text-slate-900 dark:text-white font-bold">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(order.promo_discount) > 0 && (
                <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Promo Discount</span>
                  <span>-₹{parseFloat(order.promo_discount).toFixed(2)}</span>
                </div>
              )}
              {parseFloat(order.wallet_discount) > 0 && (
                <div className="flex justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Wallet Applied</span>
                  <span>-₹{parseFloat(order.wallet_discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-medium pt-1">
                <span className="text-slate-500 dark:text-slate-400">Payment Mode</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {order.payment_method || (parseFloat(order.total_amount) === 0 ? 'Wallet' : 'COD')}
                </span>
              </div>
              <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 mt-3">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">Total Due</span>
                <span className="text-xl font-black text-indigo-700 dark:text-indigo-400 tracking-tight">₹{order.total_amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Reject Order */}
      {isRejectModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Decline This Order?</h2>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to reject Order <strong className="font-mono text-slate-900 dark:text-white">#{order.id}</strong> (Total: ₹{order.total_amount})? The customer will be informed and any reserved wallet funds will be returned.
            </p>

            <div className="pt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                disabled={isUpdating}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStatus('REJECTED')}
                disabled={isUpdating}
                className="px-4 py-2 text-white font-bold bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal: Reject Item */}
      {rejectingItem && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0d1322] rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Reject Item?</h2>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Remove <strong className="text-slate-900 dark:text-white">"{rejectingItem.product_name_snapshot}"</strong> ({rejectingItem.quantity}x) from the order? The order total will be reduced by <strong className="text-slate-900 dark:text-white">₹{rejectingItem.subtotal}</strong>.
            </p>

            <div className="pt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                disabled={isUpdating}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRejectItem}
                disabled={isUpdating}
                className="px-4 py-2 text-white font-bold bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm text-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tax Invoice Modal Popup */}
      {isInvoiceModalOpen && (
        <InvoiceModal
          orderId={id}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderDetails;
