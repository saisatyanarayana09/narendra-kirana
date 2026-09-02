import { Link, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Heart, Bell, MessageSquare, HelpCircle, LogOut, ChevronRight, IndianRupee, Gift } from 'lucide-react';
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
    { name: 'Digital Wallet', desc: 'Check your balance and transactions', icon: IndianRupee, path: '/profile/wallet', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Refer & Earn', desc: 'Invite friends, earn real money!', icon: Gift, path: '/profile/refer-and-earn', color: 'text-teal-600', bg: 'bg-teal-50' },
    { name: 'Account Settings', desc: 'Manage password & personal details', icon: User, path: '/profile/account', color: 'text-primary-600', bg: 'bg-primary-50' },
    { name: 'Saved Addresses', desc: 'Edit addresses for quick checkout', icon: MapPin, path: '/profile/addresses', color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'Favorites', desc: 'View your saved products', icon: Heart, path: '/profile/favorites', color: 'text-rose-600', bg: 'bg-rose-50' },
    { name: 'Notifications', desc: 'Offers and order updates', icon: Bell, path: '/profile/notifications', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Leave Feedback', desc: 'Tell us how we are doing', icon: MessageSquare, path: '/profile/feedback', color: 'text-slate-600', bg: 'bg-slate-100' },
    { name: 'Help Center', desc: 'Contact support for assistance', icon: HelpCircle, path: '/profile/help', color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  const initials = (user?.first_name 
    ? user.first_name.slice(0, 2) 
    : (user?.username ? user.username.slice(0, 2) : 'NK')
  ).toUpperCase();

  return (
    <div>
      {/* Improved Customer Name Hero Background */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 p-6 sm:p-8 text-white shadow-lg mb-8">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-emerald-900 flex items-center justify-center text-xl sm:text-2xl font-black shadow-md flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 border border-white/20 text-xs font-bold mb-1.5">
              <span>✨</span> Verified Smart Customer
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
              Hi, {user?.first_name || user?.username || 'Customer'}!
            </h1>
            <p className="text-emerald-100/80 text-xs sm:text-sm mt-0.5 truncate">
              {user?.email || 'Manage your account and track your orders.'}
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Action Cards: Symbol on Left, Text on Right, Decreased Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link 
              key={idx}
              to={card.path}
              className="group flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-primary-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
            >
              <div className="flex items-center gap-3.5 relative z-10 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg} ${card.color} transition-transform duration-200 group-hover:scale-105 shadow-inner`}>
                  <Icon size={22} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-primary-700 transition-colors truncate">
                    {card.name}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 truncate">
                    {card.desc}
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 transition-colors ml-2">
                <ChevronRight size={16} className="text-slate-400 group-hover:text-primary-600 transition-colors translate-x-0 group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Sign Out Button at Bottom */}
      <div className="mt-10 pt-6 border-t border-slate-200 flex justify-center">
        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 transition-all font-bold text-sm shadow-sm border border-rose-200/70 active:scale-95"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
