import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Trash2, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useCart } from '../../cart-context';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const { refresh } = useCart();
  
  useEffect(() => {
    api.get('/notifications/').then(res => setNotifications(res.data.results || res.data || [])).catch(() => {});
  }, []);

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}/`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      refresh();
    } catch (err) {
      console.error(err);
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
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h2>
            <p className="text-sm text-slate-500 mt-1">Updates about your orders and offers.</p>
          </div>
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-12 text-center h-[50vh]">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-primary-300 mb-5">
            <Bell size={40} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">You're all caught up!</h3>
          <p className="text-gray-500 max-w-sm mx-auto">We'll notify you here when there are updates about your orders or exciting new offers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} className={`bg-white rounded-xl p-4 shadow-sm border ${n.is_read ? 'border-gray-100 ' : 'border-primary-200 bg-primary-50 '}`}>
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold ${n.is_read ? 'text-gray-900 ' : 'text-primary-900 '}`}>{n.title}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{new Date(n.created_at).toLocaleDateString()}</span>
                  <button onClick={() => deleteNotification(n.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                </div>
              </div>
              <p className={`text-sm ${n.is_read ? 'text-gray-600 ' : 'text-primary-800 '}`}>{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
