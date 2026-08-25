import React from 'react';
import { Link } from 'react-router-dom';
import { PackageSearch, ShoppingBag, Settings, Megaphone } from 'lucide-react';

const Welcome = () => {
  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();
  
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="max-w-4xl mx-auto mt-6 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 text-center animate-fade-in">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <span className="text-5xl">👋</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
        {greeting}, {ownerName}!
      </h1>
      
      <p className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto">
        Welcome to your Smart Kirana Owner Portal. Everything is running smoothly. What would you like to work on today?
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/owner" className="flex items-center p-6 border border-slate-100 bg-slate-50 rounded-2xl hover:bg-white hover:border-emerald-300 hover:shadow-lg transition-all group">
          <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
            <ShoppingBag size={28} />
          </div>
          <div className="ml-5 text-left">
            <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">View Dashboard</h3>
            <p className="text-sm text-slate-500 mt-1">Check today's orders and store analytics</p>
          </div>
        </Link>
        
        <Link to="/owner/products" className="flex items-center p-6 border border-slate-100 bg-slate-50 rounded-2xl hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all group">
          <div className="bg-blue-100 p-4 rounded-xl text-blue-600 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
            <PackageSearch size={28} />
          </div>
          <div className="ml-5 text-left">
            <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">Manage Products</h3>
            <p className="text-sm text-slate-500 mt-1">Add or update your grocery inventory</p>
          </div>
        </Link>
        
        <Link to="/owner/showcase" className="flex items-center p-6 border border-slate-100 bg-slate-50 rounded-2xl hover:bg-white hover:border-purple-300 hover:shadow-lg transition-all group">
          <div className="bg-purple-100 p-4 rounded-xl text-purple-600 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-sm">
            <Megaphone size={28} />
          </div>
          <div className="ml-5 text-left">
            <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">Storefront Banners</h3>
            <p className="text-sm text-slate-500 mt-1">Customize the customer homepage layout</p>
          </div>
        </Link>
        
        <Link to="/owner/settings" className="flex items-center p-6 border border-slate-100 bg-slate-50 rounded-2xl hover:bg-white hover:border-orange-300 hover:shadow-lg transition-all group">
          <div className="bg-orange-100 p-4 rounded-xl text-orange-600 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
            <Settings size={28} />
          </div>
          <div className="ml-5 text-left">
            <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-700 transition-colors">Store Settings</h3>
            <p className="text-sm text-slate-500 mt-1">Open/close store and set delivery fees</p>
          </div>
        </Link>
      </div>
    </div>
  );
};
export default Welcome;
