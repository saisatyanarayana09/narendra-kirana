import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, BadgeCheck } from 'lucide-react';
import api from '../../services/api';

const Invoice = () => {
 const { id } = useParams();
 const [order, setOrder] = useState(null);
 const [settings, setSettings] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);

 useEffect(() => {
 const fetchData = async () => {
 try {
 const [orderRes, settingsRes] = await Promise.all([
 api.get(`/orders/${id}/`),
 api.get('/store/settings/')
 ]);
 setOrder(orderRes.data);
 setSettings(settingsRes.data);
 } catch (err) {
 console.error(err);
 setError('Failed to load invoice details.');
 } finally {
 setLoading(false);
 }
 };
 fetchData();
 }, [id]);

 if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Loading invoice...</div>;
 if (error || !order) return <div className="p-12 text-center text-red-500 font-medium">{error}</div>;

 const handlePrint = () => {
 window.print();
 };

 // Logic Fix: Robust Date Parsing
 const orderDateObj = new Date(order.created_at);
 const isOrderDateValid = !isNaN(orderDateObj.getTime());
 const orderDate = isOrderDateValid ? orderDateObj.toLocaleString('en-IN', {
   year: 'numeric', month: 'long', day: 'numeric',
   hour: '2-digit', minute: '2-digit', hour12: true
 }) : 'N/A';

 const invoiceDateObj = new Date();
 const invoiceDate = invoiceDateObj.toLocaleString('en-IN', {
   year: 'numeric', month: 'long', day: 'numeric',
   hour: '2-digit', minute: '2-digit', hour12: true
 });

 // Logic Fix: Professional Invoice Number Formatting
 const orderYear = isOrderDateValid ? orderDateObj.getFullYear() : invoiceDateObj.getFullYear();
 const invoiceNumber = `INV-${orderYear}-${String(order.id).padStart(5, '0')}`;

 // Logic Fix: Brand Rendering Helper
 const renderBrand = (storeNameStr, className = "") => {
 const name = storeNameStr || "Narendra Kirana";
 const nameLower = name.trim().toLowerCase();
 if (nameLower.includes("narendra kirana")) {
 return (
 <span className={`whitespace-nowrap ${className}`}>
 <span className="text-emerald-900">NARENDRA</span> <span className="text-primary-600 ml-1.5">KIRANA</span>
 {nameLower.includes("store") && <span className="text-primary-600 ml-1.5">STORE</span>}
 </span>
 );
 }
 return <span className={`text-emerald-900 whitespace-nowrap ${className}`}>{name}</span>;
 };

 return (
 <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 print:bg-white print:py-0 print:px-0 font-sans">
 
  {/* Non-printable action bar */}
  <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center print:hidden">
  <Link to={`/owner/orders/${id}`} className="w-full sm:w-auto justify-center inline-flex items-center text-slate-600 hover:text-slate-900 font-medium bg-white px-5 py-2.5 rounded-lg shadow-sm border border-slate-200 transition-colors">
  <ArrowLeft className="w-4 h-4 mr-2"/> Back to Order
  </Link>
  <button 
  onClick={handlePrint}
  className="w-full sm:w-auto justify-center inline-flex items-center bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 shadow-sm transition-colors"
  >
  <Printer className="w-5 h-5 mr-2"/> Download / Print PDF
  </button>
  </div>

  {/* Printable A4 Invoice Container */}
 <div data-testid="invoice-container" className="relative max-w-4xl mx-auto bg-white p-4 sm:p-8 md:p-12 shadow-xl shadow-slate-200/50 rounded-sm print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 text-slate-800 overflow-hidden">

 {order.status === 'REJECTED' && (
   <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none opacity-40 mix-blend-multiply print:opacity-30">
     <div className="border-[6px] sm:border-[10px] border-red-600 text-red-600 text-[60px] sm:text-[100px] font-black tracking-widest uppercase py-4 px-8 sm:py-6 sm:px-12 rounded-3xl transform -rotate-45 select-none text-center">
       REJECTED
     </div>
   </div>
 )}
 
 <div className={order.status === 'REJECTED' ? 'opacity-70 grayscale-[30%]' : ''}>
  
  {/* Header Section */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-2 border-emerald-900 pb-6 mb-8 gap-4">
  <div>
  <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase mb-2">
  {renderBrand(settings?.store_name)}
  </h1>
  <div className="text-sm text-slate-600 space-y-0.5 leading-relaxed">
  {settings?.store_address && <p className="whitespace-pre-wrap max-w-xs">{settings.store_address}</p>}
  {settings?.store_phone && <p>{settings.store_phone}</p>}
  {settings?.store_email && <p>{settings.store_email}</p>}
  </div>
  </div>
  <div className="sm:text-right w-full sm:w-auto border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
  <h2 className="text-4xl sm:text-5xl font-black text-slate-200 uppercase tracking-widest print:text-slate-300 mb-2">INVOICE</h2>
  </div>
  </div>

  {/* Info Grid Section */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-10 text-sm">
  <div>
  <h3 className="font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1 inline-block">Billed To</h3>
  <p className="text-lg font-bold text-slate-900 mt-2">{order.customer_name || `Customer ID: ${order.customer}`}</p>
  <p className="text-slate-600 mt-1">Order Status: <span className={`font-semibold ${order.status === 'REJECTED' ? 'text-red-600 font-bold' : 'text-slate-800'}`}>{order.status}</span></p>
  
  <div className="mt-4 pt-3 border-t border-slate-100 print:border-slate-200">
    <p className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-1">
      Order Type: <span className={order.order_type === 'DELIVERY' ? 'text-indigo-600 print:text-black' : 'text-slate-800'}>{order.order_type === 'DELIVERY' ? 'HOME DELIVERY' : 'STORE PICKUP'}</span>
    </p>
    {order.order_type === 'DELIVERY' ? (
      <div className="text-slate-600 mt-1">
        <p className="font-medium whitespace-pre-wrap">{order.delivery_address}</p>
        {order.delivery_pincode && <p>Pincode: {order.delivery_pincode}</p>}
      </div>
    ) : (
      <p className="text-slate-600 mt-1 font-medium">Pickup Time: {order.pickup_time || 'As soon as possible'}</p>
    )}
  </div>
  </div>
  <div className="sm:text-right">
  <div className="inline-block w-full sm:w-auto text-left bg-slate-50 p-4 rounded-md border border-slate-100 print:bg-transparent print:border-none print:p-0">
  <div className="flex justify-between gap-x-6 gap-y-2 mb-2">
  <p className="text-slate-500 font-medium">Invoice No:</p>
  <p className="font-bold text-slate-900 text-right break-all max-w-[200px]">{invoiceNumber}</p>
  </div>
  <div className="flex justify-between gap-x-6 gap-y-2 mb-2">
  <p className="text-slate-500 font-medium">Invoice Date:</p>
  <p className="font-bold text-slate-900 text-right">{invoiceDate}</p>
  </div>
  <div className="flex justify-between gap-x-6 gap-y-2">
  <p className="text-slate-500 font-medium">Order Date:</p>
  <p className="font-bold text-slate-900 text-right whitespace-nowrap">{orderDate}</p>
  </div>
  </div>
  </div>
  </div>

 {/* Items Table */}
 <div className="mb-10 overflow-x-auto">
 <table className="w-full text-left text-sm border-collapse min-w-[500px]">
 <thead>
 <tr className="bg-slate-100 border-y border-slate-300 print:bg-slate-50 print:border-y-2 print:border-slate-800">
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider w-1/2">Item Description</th>
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider text-center w-1/6">Qty</th>
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider text-right w-1/6">Price</th>
 <th className="py-3 px-4 font-bold text-slate-800 uppercase tracking-wider text-right w-1/6">Amount</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {order.items.map((item, index) => {
 const isRejected = item.status === 'REJECTED';
 return (
 <tr key={index} className="print:break-inside-avoid">
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 <p className={`font-bold ${isRejected ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
 {item.product_name_snapshot}
 </p>
 {isRejected && (
 <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded uppercase tracking-wider print:border-rose-400 print:text-rose-700">
 Unavailable
 </span>
 )}
 </div>
 <p className="text-xs text-slate-500 mt-1">{item.unit_snapshot}</p>
 </td>
 <td className={`py-4 px-4 text-center font-semibold ${isRejected ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{item.quantity}</td>
 <td className={`py-4 px-4 text-right ${isRejected ? 'text-slate-500 line-through' : 'text-slate-600'}`}>₹{parseFloat(item.price_snapshot).toFixed(2)}</td>
 <td className={`py-4 px-4 text-right font-bold ${isRejected ? 'text-slate-500' : 'text-slate-900'}`}>
 {isRejected ? '₹0.00' : `₹${parseFloat(item.subtotal).toFixed(2)}`}
 </td>
 </tr>
 )})}
 </tbody>
 </table>
 </div>

 {/* Totals Section */}
 <div className="flex justify-end mb-16 print:break-inside-avoid">
 <div className="w-full sm:w-1/2 lg:w-[40%]">
 <div className="flex justify-between py-2 text-sm text-slate-600">
 <span>Subtotal</span>
 <span className="font-semibold text-slate-900">
 ₹{order.items.filter(i => i.status !== 'REJECTED').reduce((acc, item) => acc + parseFloat(item.subtotal), 0).toFixed(2)}
 </span>
 </div>
 
 {parseFloat(order.discount_applied) > 0 && (
  <div className="flex justify-between py-2 text-sm text-indigo-600 border-t border-slate-100">
  <span>Product Savings</span>
  <span className="font-bold">-₹{parseFloat(order.discount_applied).toFixed(2)}</span>
  </div>
  )}

 {parseFloat(order.promo_discount) > 0 && (
 <div className="flex justify-between py-2 text-sm text-emerald-600 border-t border-slate-100">
 <span>Promo Discount</span>
 <span className="font-bold">-₹{parseFloat(order.promo_discount).toFixed(2)}</span>
 </div>
 )}

  {parseFloat(order.packaging_fee) > 0 && (
  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Packaging Fee</span>
  <span className="font-semibold text-slate-900">₹{parseFloat(order.packaging_fee).toFixed(2)}</span>
  </div>
  )}

  {order.order_type === 'DELIVERY' && (
  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Delivery Fee</span>
  <span className="font-semibold text-slate-900">{parseFloat(order.delivery_fee) > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}</span>
  </div>
  )}

  {parseFloat(order.wallet_discount) > 0 && (
  <div className="flex justify-between py-2 text-sm text-emerald-700 border-t border-slate-100">
  <span className="font-bold">Wallet Applied</span>
  <span className="font-bold">-₹{parseFloat(order.wallet_discount).toFixed(2)}</span>
  </div>
  )}

  <div className="flex justify-between py-2 text-sm text-slate-600 border-t border-slate-100">
  <span>Payment Method</span>
  <span className="font-bold text-slate-900">
    {parseFloat(order.total_amount) === 0 ? 'Wallet Full' : (parseFloat(order.wallet_discount) > 0 ? 'Hybrid (Wallet + Cash)' : 'Cash at Store')}
  </span>
  </div>
  
  <div className="flex justify-between items-center border-t-2 border-emerald-900 bg-emerald-50/50 p-4 mt-2 print:bg-transparent print:border-t-4 print:border-black">
  <span className="text-base font-bold text-slate-900 uppercase tracking-widest">{order.status === 'COMPLETED' ? 'Total Paid' : 'Total Due'}</span>
  <span className="text-2xl font-black text-emerald-900 print:text-black">₹{parseFloat(order.total_amount).toFixed(2)}</span>
  </div>
  </div>
  </div>

 {/* Footer & Signatures */}
 <div className="border-t border-slate-300 pt-8 mt-auto print:break-inside-avoid flex flex-col sm:flex-row gap-8 justify-between items-start sm:items-end">
 <div className="text-xs text-slate-500 max-w-sm">
 <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-widest flex items-center">
 <BadgeCheck className="w-4 h-4 mr-1 text-emerald-700" /> Terms & Info
 </h4>
 <p className="mb-1">1. Please keep this invoice for your records.</p>
 <p className="mb-2">2. Goods sold are non-refundable without valid receipt.</p>
 <p className="text-slate-800 font-medium">Thank you for your business!</p>
 </div>
 
 <div className="text-left sm:text-right w-full sm:w-auto">
 <div className="border-b border-slate-400 pb-2 mb-2 w-48 ml-0 sm:ml-auto flex flex-col justify-end items-start sm:items-center h-16">
 {settings?.invoice_signature ? (
 <img src={settings.invoice_signature} alt="Signature" className="max-h-12 object-contain grayscale mix-blend-multiply"/>
 ) : (
 <span className="font-[cursive] text-xl text-slate-700 opacity-80 select-none italic">
 {settings?.store_name || "Authorized"}
 </span>
 )}
 </div>
 <p className="text-sm font-bold text-slate-900">Authorized Signatory</p>
 <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">Narendra Kirana</p>
 </div>
 </div>
 
 </div>
 </div>
 </div>
 );
};

export default Invoice;
