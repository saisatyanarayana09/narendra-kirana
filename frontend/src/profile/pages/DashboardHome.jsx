import { Link, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Heart, Bell, MessageSquare, HelpCircle, LogOut, ChevronRight, Wallet, Gift } from 'lucide-react';
import { useCart } from '../../cart-context';

export default function DashboardHome() {
  const { user, syncUser } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('smart-kirana-customer-token');
    localStorage.removeItem('smart-kirana-customer-refresh');
    localStorage.removeItem('smart-kirana-customer-user');
    sessionStorage.removeItem('hasShownWelcome');
    syncUser();
    navigate('/');
  };

  const cards = [
    { name: 'Your Orders', desc: 'Track, return, or buy things again', icon: Package, path: '/profile/orders', color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Digital Wallet', desc: 'Check your balance and transactions', icon: Wallet, path: '/profile/wallet', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Refer & Earn', desc: 'Invite friends, earn real money!', icon: Gift, path: '/profile/refer-and-earn', color: 'text-teal-600', bg: 'bg-teal-50' },
    { name: 'Account Settings', desc: 'Manage password & personal details', icon: User, path: '/profile', color: 'text-primary-600', bg: 'bg-primary-50' },
    { name: 'Saved Addresses', desc: 'Edit addresses for quick checkout', icon: MapPin, path: '/profile/addresses', color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Favorites', desc: 'View your saved products', icon: Heart, path: '/profile/favorites', color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Notifications', desc: 'Offers and order updates', icon: Bell, path: '/profile/notifications', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Leave Feedback', desc: 'Tell us how we are doing', icon: MessageSquare, path: '/profile/feedback', color: 'text-slate-600', bg: 'bg-slate-100' },
    { name: 'Help Center', desc: 'Contact support for assistance', icon: HelpCircle, path: '/profile/help', color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Hi, {user?.first_name || user?.username || 'Customer'}!
          </h1>
          <p className="text-slate-500 mt-1">Manage your account and track your orders.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-all font-bold text-sm shadow-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link 
              key={idx}
              to={card.path}
              className="group flex flex-col justify-between p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-primary-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full relative overflow-hidden"
            >
              {/* Subtle background glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.bg} ${card.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                  <Icon size={28} />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary-50 transition-colors duration-300">
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-primary-600 transition-colors duration-300 translate-x-0 group-hover:translate-x-0.5" />
                </div>
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-extrabold text-slate-900 mb-1 group-hover:text-primary-700 transition-colors duration-300">{card.name}</h3>
                <p className="text-sm font-medium text-slate-500 line-clamp-2">{card.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
