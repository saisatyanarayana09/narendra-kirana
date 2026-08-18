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

 <aside 
 className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
 isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
 }`}
 >
 <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
 <span className="text-xl font-bold text-white tracking-wide">Owner Portal</span>
 <button className="lg:hidden text-slate-400 hover:text-white transition-colors"onClick={() => setIsSidebarOpen(false)}>
 <X className="w-6 h-6"/>
 </button>
 </div>

 <nav className="p-4 space-y-1">
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

 <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
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

 {/* Mobile Bottom Navigation */}
 <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:hidden shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)]">
 <Link className={`flex flex-1 flex-col items-center gap-1 text-[10px] sm:text-xs font-bold transition-colors ${isActive('/owner') && location.pathname === '/owner' ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`} to="/owner">
 <LayoutDashboard size={22} className={isActive('/owner') && location.pathname === '/owner' ? 'fill-indigo-100 text-indigo-600' : ''}/>
 Home
 </Link>
 <Link className={`flex flex-1 flex-col items-center gap-1 text-[10px] sm:text-xs font-bold transition-colors ${isActive('/owner/orders') ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`} to="/owner/orders">
 <ShoppingCart size={22} className={isActive('/owner/orders') ? 'fill-indigo-100 text-indigo-600' : ''}/>
 Orders
 </Link>
 <Link className={`flex flex-1 flex-col items-center gap-1 text-[10px] sm:text-xs font-bold transition-colors ${isActive('/owner/products') ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`} to="/owner/products">
 <Package size={22} className={isActive('/owner/products') ? 'fill-indigo-100 text-indigo-600' : ''}/>
 Products
 </Link>
 <Link className={`flex flex-1 flex-col items-center gap-1 text-[10px] sm:text-xs font-bold transition-colors ${isActive('/owner/referrals') ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'}`} to="/owner/referrals">
 <Gift size={22} className={isActive('/owner/referrals') ? 'fill-indigo-100 text-indigo-600' : ''}/>
 Scanner
 </Link>
 <button onClick={() => setIsSidebarOpen(true)} className="flex flex-1 flex-col items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500 hover:text-indigo-600">
 <Menu size={22}/>
 Menu
 </button>
 </nav>
 </div>
 </div>
 );
};

export default OwnerLayout;
