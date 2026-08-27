import { useState, useEffect } from 'react';
import { Users, User as UserIcon, Bell, X, Trash2, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import { createPortal } from 'react-dom';

const Customers = () => {
 const [customers, setCustomers] = useState([]);
 const [loading, setLoading] = useState(true);
 const [notifyUser, setNotifyUser] = useState(null);
 const [notifForm, setNotifForm] = useState({ title: '', message: '' });
 const [notifSending, setNotifSending] = useState(false);
 const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
 const [detailsLoading, setDetailsLoading] = useState(false);
 const [activeTab, setActiveTab] = useState('active');
 const displayedCustomers = customers.filter(c => activeTab === 'active' ? c.is_active : !c.is_active);

 
 const fetchCustomerDetails = async (id) => {
   try {
     setDetailsLoading(true);
     const { data } = await api.get(`/auth/customers/${id}/details/`);
     setSelectedCustomerDetail(data);
   } catch (err) {
     alert("Failed to load customer details.");
   } finally {
     setDetailsLoading(false);
   }
 };

 const fetchCustomers = async () => {
 try {
 setLoading(true);
 const response = await api.get('/auth/customers/');
 setCustomers(response.data.results || response.data);
 } catch (err) {
 console.error(err);
 alert('Failed to fetch customers.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchCustomers();
 }, []);

 
 const approveDeletion = async (userId) => {
   if(!window.confirm("Are you sure you want to PERMANENTLY delete this customer and all their data? This cannot be undone.")) return;
   try {
     await api.post(`/auth/customers/${userId}/approve-delete/`);
     fetchCustomers();
   } catch(err) {
     alert("Failed to approve deletion.");
   }
 };

 const rejectDeletion = async (userId) => {
   if(!window.confirm("Are you sure you want to reject this deletion request?")) return;
   try {
     await api.post(`/auth/customers/${userId}/reject-delete/`);
     fetchCustomers();
   } catch(err) {
     alert("Failed to reject deletion.");
   }
 };

 const sendNotification = async (e) => {
 e.preventDefault();
 setNotifSending(true);
 try {
 await api.post('/notifications/owner/send/', {
 user: notifyUser.id,
 title: notifForm.title,
 message: notifForm.message
 });
 alert('Notification sent successfully!');
 setNotifyUser(null);
 setNotifForm({ title: '', message: '' });
 } catch (err) {
 alert('Failed to send notification.');
 } finally {
 setNotifSending(false);
 }
 };

 return (
 <div className="max-w-7xl mx-auto space-y-6">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
   <div>
   <h1 className="text-2xl font-bold text-gray-900">Customer Directory</h1>
   <p className="text-sm text-gray-500 mt-1">View and manage registered customers</p>
   </div>
   <div className="flex items-center gap-3">
     <div className="bg-slate-100 p-1 rounded-xl inline-flex">
       <button onClick={() => setActiveTab('active')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Active</button>
       <button onClick={() => setActiveTab('deleted')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deleted' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-red-500'}`}>Deleted Accounts</button>
     </div>
     <button onClick={fetchCustomers} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium shadow-sm transition">
     Refresh
     </button>
   </div>
   </div>

 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
 {loading ? (
 <div className="p-12 text-center font-medium text-slate-500">Loading customers...</div>
 ) : displayedCustomers.length === 0 ? (
 <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
 <Users className="w-8 h-8 text-slate-400"/>
 </div>
 <h3 className="text-lg font-bold text-slate-900">No customers found</h3>
 <p className="text-slate-500 mt-1 font-medium">When customers register, they will appear here.</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-slate-100">
 <thead className="bg-slate-50">
 <tr>
 <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">Customer</th>
 <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">Username</th>
 <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-widest">Mobile Number</th>
 <th className="px-6 py-4 text-right text-xs font-extrabold text-slate-500 uppercase tracking-widest">Actions</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-slate-50">
 {displayedCustomers.map((customer) => (
 <tr key={customer.id} onClick={(e) => { if(e.target.closest("button")) return; fetchCustomerDetails(customer.id); }} className="hover:bg-slate-50 transition-colors group cursor-pointer">
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="flex items-center">
 <div className="flex-shrink-0 h-10 w-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold group-hover:bg-indigo-100 transition-colors">
 {customer.first_name ? customer.first_name[0].toUpperCase() : <UserIcon size={20} />}
 </div>
 <div className="ml-4">
 <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{customer.first_name || 'Unknown'} {customer.last_name}</div>
 <div className="text-xs font-medium text-slate-500">ID: #{customer.id}</div>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-medium text-slate-700">{customer.username}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap">
 <div className="text-sm font-medium text-slate-700">{customer.customer_profile?.mobile_number || 'N/A'}</div>
 </td>
 <td className="px-6 py-4 whitespace-nowrap text-right">
    <div className="flex items-center justify-end gap-2">
      {!customer.is_active ? (
        <span className="bg-slate-100 text-slate-500 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200">Account Deleted</span>
      ) : (
        <>
          <button onClick={(e) => { e.stopPropagation(); setNotifyUser(customer); }} className="text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2" title="Send Notification">
            <Bell size={16} /> Notify
          </button>
          {customer.customer_profile?.delete_requested && (
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 p-1 rounded-xl">
              <span className="text-xs font-bold text-red-600 px-2 uppercase tracking-wide">Delete Requested</span>
              <button onClick={(e) => { e.stopPropagation(); approveDeletion(customer.id); }} className="text-white bg-red-600 hover:bg-red-700 p-1.5 rounded-lg transition-colors" title="Approve Deletion">
                <CheckCircle size={16} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); rejectDeletion(customer.id); }} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg transition-colors" title="Reject Deletion">
                <XCircle size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
   </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {notifyUser && createPortal(
 <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
 <h3 className="font-extrabold text-xl text-slate-900">Notify {notifyUser.first_name || notifyUser.username}</h3>
 <button onClick={() => setNotifyUser(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
 </div>
 <form onSubmit={sendNotification} className="p-6 space-y-5">
 <div>
 <label className="text-sm font-bold text-slate-700 block mb-1.5">Title</label>
 <input required value={notifForm.title} onChange={e=>setNotifForm({...notifForm, title:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"placeholder="e.g. Special Offer!"/>
 </div>
 <div>
 <label className="text-sm font-bold text-slate-700 block mb-1.5">Message</label>
 <textarea required value={notifForm.message} onChange={e=>setNotifForm({...notifForm, message:e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-28 resize-none"placeholder="Type your message here..."/>
 </div>
 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
 <button type="button"onClick={() => setNotifyUser(null)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
 <button type="submit"disabled={notifSending} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
 {notifSending ? 'Sending...' : 'Send Notification'}
 </button>
 </div>
 </form>
 </div>
 </div>
 , document.body)}
   {/* Customer Detail Modal */}
   {selectedCustomerDetail && createPortal(
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
         {/* Header */}
         <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
             <UserIcon className="text-slate-400" size={20} />
             Customer Profile
           </h2>
           <button onClick={() => setSelectedCustomerDetail(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
             <X size={20} />
           </button>
         </div>
         
         {/* Body */}
         <div className="p-6 overflow-y-auto">
           {detailsLoading ? (
             <div className="py-12 text-center text-slate-500 font-medium">Loading details...</div>
           ) : (
             <div className="space-y-6">
               {/* Quick Stats Grid */}
               <div className="grid grid-cols-3 gap-4">
                 <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-indigo-900 mb-1">Lifetime Sales</div>
                   <div className="text-2xl font-extrabold text-indigo-700">₹{selectedCustomerDetail.total_spent?.toFixed(2) || '0.00'}</div>
                 </div>
                 <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-emerald-900 mb-1">Total Orders</div>
                   <div className="text-2xl font-extrabold text-emerald-700">{selectedCustomerDetail.total_orders || 0}</div>
                 </div>
                 <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                   <div className="text-sm font-bold text-amber-900 mb-1">Wallet Balance</div>
                   <div className="text-2xl font-extrabold text-amber-700">₹{selectedCustomerDetail.wallet_balance?.toFixed(2) || '0.00'}</div>
                 </div>
               </div>
               
               {/* Contact Info */}
               <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Contact Information</h3>
                 <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Name</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.first_name || 'Unknown'} {selectedCustomerDetail.last_name}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Email</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.email || selectedCustomerDetail.username}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Mobile</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.mobile_number || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Date of Birth</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.dob || 'N/A'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-sm font-medium text-slate-500">Referral Code</span>
                     <span className="text-sm font-bold text-slate-900">{selectedCustomerDetail.customer_profile?.referral_code || 'N/A'}</span>
                   </div>
                 </div>
               </div>
               
               {/* Recent Orders */}
               <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Recent Orders</h3>
                 {selectedCustomerDetail.recent_orders?.length > 0 ? (
                   <div className="border border-slate-100 rounded-xl overflow-hidden">
                     <table className="min-w-full divide-y divide-slate-100">
                       <thead className="bg-slate-50">
                         <tr>
                           <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Order ID</th>
                           <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                           <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Amount</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 bg-white">
                         {selectedCustomerDetail.recent_orders.map(order => (
                           <tr key={order.id}>
                             <td className="px-4 py-3 text-sm font-bold text-indigo-600">{order.id}</td>
                             <td className="px-4 py-3 text-sm font-medium text-slate-600">{order.status}</td>
                             <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">₹{order.total_amount?.toFixed(2)}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 ) : (
                   <div className="p-4 bg-slate-50 rounded-xl text-center text-sm font-medium text-slate-500 border border-slate-100">
                     No orders found for this customer.
                   </div>
                 )}
               </div>
             </div>
           )}
         </div>
       </div>
     </div>,
     document.body
   )}
   </div>
 );
};

export default Customers;
