import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, 
  Menu, X, LogOut, PercentCircle, MessageSquare, Layout, Gift, 
  TrendingUp, LayoutGrid 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const OwnerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ is_open: true, loaded: false });
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/owner', icon: LayoutDashboard, desc: 'Live stats & store overview', color: 'from-blue-500 to-indigo-600', badge: 'Overview' },
    { name: 'Orders', href: '/owner/orders', icon: ShoppingCart, desc: 'Manage & pack orders', color: 'from-emerald-500 to-teal-600', badge: 'Live' },
    { name: 'Products', href: '/owner/products', icon: Package, desc: 'Inventory & catalog', color: 'from-amber-500 to-orange-600', badge: 'Stock' },
    { name: 'Sales', href: '/owner/sales', icon: TrendingUp, desc: 'Revenue & analytics', color: 'from-violet-500 to-purple-600', badge: 'Analytics' },
    { name: 'Showcase', href: '/owner/showcase', icon: Layout, desc: 'Banners & home aisles', color: 'from-pink-500 to-rose-600', badge: 'Visual' },
    { name: 'Categories', href: '/owner/categories', icon: Tags, desc: 'Aisles & departments', color: 'from-cyan-500 to-blue-600', badge: 'Aisles' },
    { name: 'Offers', href: '/owner/offers', icon: PercentCircle, desc: 'Coupons & discounts', color: 'from-red-500 to-rose-600', badge: 'Promo' },
    { name: 'Referrals', href: '/owner/referrals', icon: Gift, desc: 'Customer referral network', color: 'from-yellow-500 to-amber-600', badge: 'Rewards' },
    { name: 'Customers', href: '/owner/customers', icon: Users, desc: 'Customer directory & CRM', color: 'from-emerald-600 to-green-700', badge: 'CRM' },
    { name: 'Feedback', href: '/owner/feedback', icon: MessageSquare, desc: 'Reviews & customer ratings', color: 'from-indigo-600 to-blue-700', badge: 'Reviews' },
    { name: 'Settings', href: '/owner/settings', icon: Settings, desc: 'Store hours, delivery & fees', color: 'from-slate-600 to-slate-800', badge: 'Config' },
  ];

  // Fetch store status for header
  useEffect(() => {
    api.get('/store/settings/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        if (data) setStoreStatus({ is_open: data.is_open, loaded: true });
      })
      .catch(() => {});
  }, []);

  const isActive = (path) => {
    if (path === '/owner') return location.pathname === '/owner';
    return location.pathname.startsWith(path);
  };

  const currentSection = navigation.find(item => isActive(item.href)) || navigation[0];

  const handleLogout = () => {
    localStorage.removeItem('smart-kirana-owner-token');
    localStorage.removeItem('smart-kirana-owner-refresh');
    localStorage.removeItem('smart-kirana-owner-user');
    window.location.href = '/owner/login';
  };

  const toggleStoreStatus = async () => {
    try {
      const newStatus = !storeStatus.is_open;
      await api.patch('/store/settings/', { is_open: newStatus });
      setStoreStatus({ is_open: newStatus, loaded: true });
      toast.success(newStatus ? 'Store is now LIVE!' : 'Store is now OFFLINE.');
    } catch {
      toast.error('Failed to update store status');
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar – uses flex-col so nav scrolls and logout stays at bottom */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex flex-col justify-center">
            <Link to="/owner" className="text-xl font-black tracking-tighter whitespace-nowrap leading-tight">
              <span className="text-white">Narendra</span>
              <span className="text-emerald-400 ml-1">Kirana</span>
            </Link>
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">Store Manager</span>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-white transition-colors" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6"/>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold shadow-sm'
                    : 'hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="flex-1">{item.name}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white hover:translate-x-1 transition-all duration-200 group font-medium"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-500 group-hover:text-rose-400 transition-colors"/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="flex items-center justify-between h-14 px-3 sm:px-6 bg-white border-b border-slate-200 lg:hidden shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5"/>
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight leading-tight">
                <span className="text-slate-900">Narendra </span>
                <span className="text-emerald-600">Kirana</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 leading-none">
                {currentSection.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Store status pill */}
            {storeStatus.loaded && (
              <button
                onClick={toggleStoreStatus}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border transition-all ${
                  storeStatus.is_open 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
                title="Click to toggle store online/offline"
              >
                <span className={`w-2 h-2 rounded-full ${storeStatus.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>{storeStatus.is_open ? 'Online' : 'Closed'}</span>
              </button>
            )}

            {/* All Sections Hub Button */}
            <button
              onClick={() => setIsHubOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 bg-slate-50"
              title="View all sections"
            >
              <LayoutGrid className="w-4 h-4 text-emerald-600" />
              <span>Hub</span>
            </button>
          </div>
        </header>

        {/* Mobile Quick Section Switcher Ribbon – 1-tap jump to ANY section */}
        <div className="lg:hidden bg-white border-b border-slate-200/80 px-2 py-2 overflow-x-auto hide-scrollbar flex items-center gap-1.5 shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Icon size={13} className={active ? 'text-emerald-400' : 'text-slate-500'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Main Content Area – clean full-height layout with no bottom bar */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6 pb-6 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile All-Sections Hub Bottom Sheet Modal */}
        {isHubOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsHubOpen(false)}
            />

            {/* Modal Sheet */}
            <div className="relative z-10 w-full max-h-[85dvh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t border-slate-200">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <LayoutGrid size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Store Sections Hub</h3>
                    <p className="text-[11px] font-medium text-slate-500">Quickly assess and jump to any section</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHubOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600 hover:bg-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Store status banner inside Hub */}
              <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${storeStatus.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <div>
                    <p className="text-xs font-bold">Store Status: {storeStatus.is_open ? 'Live & Accepting Orders' : 'Store Offline'}</p>
                    <p className="text-[10px] text-slate-400">Click toggle to change customer visibility</p>
                  </div>
                </div>
                <button
                  onClick={toggleStoreStatus}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all shadow-sm ${
                    storeStatus.is_open 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  {storeStatus.is_open ? 'Set Offline' : 'Go Live'}
                </button>
              </div>

              {/* Sections Grid */}
              <div className="p-4 overflow-y-auto grid grid-cols-2 gap-2.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsHubOpen(false)}
                      className={`flex flex-col p-3 rounded-2xl border transition-all duration-200 active:scale-95 ${
                        active
                          ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500 shadow-sm'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-sm`}>
                          <Icon size={16} />
                        </div>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 leading-tight">{item.name}</span>
                      <span className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-1">{item.desc}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Bottom Close Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setIsHubOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-300 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerLayout;


