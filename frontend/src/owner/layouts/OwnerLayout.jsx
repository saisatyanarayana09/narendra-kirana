import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, Menu, X, LogOut, PercentCircle, MessageSquare, Layout, Gift } from 'lucide-react';

const OwnerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
    { name: 'Orders', href: '/owner/orders', icon: ShoppingCart },
    { name: 'Products', href: '/owner/products', icon: Package },
    { name: 'Showcase', href: '/owner/showcase', icon: Layout },
    { name: 'Categories', href: '/owner/categories', icon: Tags },
    { name: 'Offers', href: '/owner/offers', icon: PercentCircle },
    { name: 'Referrals', href: '/owner/referrals', icon: Gift },
    { name: 'Customers', href: '/owner/customers', icon: Users },
    { name: 'Feedback', href: '/owner/feedback', icon: MessageSquare },
    { name: 'Settings', href: '/owner/settings', icon: Settings },
  ];

  const isActive = (path) => {
    if (path === '/owner') return location.pathname === '/owner';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('smart-kirana-owner-token');
    localStorage.removeItem('smart-kirana-owner-refresh');
    localStorage.removeItem('smart-kirana-owner-user');
    window.location.href = '/owner/login';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar – uses flex-col so nav scrolls and logout stays at bottom */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex flex-col justify-center">
            <Link to="/owner" className="text-xl font-black tracking-tighter whitespace-nowrap leading-tight">
              <span className="text-white">Narendra</span>
              <span className="text-primary-500 ml-1">Kirana</span>
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
                    ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                    : 'hover:bg-slate-800 hover:text-white hover:translate-x-1'
                }`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon className={`w-5 h-5 mr-3 transition-colors ${active ? 'text-indigo-400' : 'text-slate-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 w-full p-4 border-t border-slate-800 bg-slate-900">
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white hover:translate-x-1 transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-500 group-hover:text-white transition-colors"/>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="w-6 h-6"/>
          </button>
          <span className="text-xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm">
            <span className="text-emerald-900">Narendra</span>
            <span className="text-primary-600 ml-1">Kirana</span>
          </span>
          <div className="w-6"/> {/* Placeholder for balance */}
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation – 5 key items only */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] lg:hidden shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.08)]">
          {[
            { name: 'Home', href: '/owner', icon: LayoutDashboard },
            { name: 'Orders', href: '/owner/orders', icon: ShoppingCart },
            { name: 'Products', href: '/owner/products', icon: Package },
            { name: 'Settings', href: '/owner/settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-indigo-600'
                    : 'text-slate-400 hover:text-indigo-600'
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${active ? 'bg-indigo-50' : ''}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 rounded-xl text-slate-400 hover:text-indigo-600 transition-all duration-200"
          >
            <div className="flex items-center justify-center w-10 h-7 rounded-full">
              <Menu size={20} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default OwnerLayout;
