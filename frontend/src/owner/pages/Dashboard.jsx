import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { 
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Power, Plus, Gift, Tag, Activity,
  BrainCircuit, Users, Target, PlusCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, analyticsRes, settingsRes, productsRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/orders/analytics/'),
        api.get('/store/settings/'),
        api.get('/products/?limit=100')
      ]);
      setOrders(ordersRes.data.results || ordersRes.data);
      setAnalytics(analyticsRes.data);
      setStoreSettings(settingsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async () => {
    if (!storeSettings) return;
    setToggling(true);
    try {
      const newStatus = !storeSettings.is_open;
      await api.patch('/store/settings/', { is_open: newStatus });
      setStoreSettings({ ...storeSettings, is_open: newStatus });
      toast.success(newStatus ? 'Store is now LIVE and accepting orders!' : 'Store is now OFFLINE.');
    } catch (err) {
      toast.error('Failed to update store status');
    } finally {
      setToggling(false);
    }
  };

  const handleQuickRestock = async (e, product, amount) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic UI update
    const previousStock = product.stock_quantity;
    const newStock = previousStock + amount;
    setProducts(products.map(p => p.id === product.id ? { ...p, stock_quantity: newStock } : p));
    
    try {
      await api.patch(`/products/${product.id}/`, { stock_quantity: newStock });
      toast.success(`Restocked ${amount}x ${product.name}!`);
    } catch (err) {
      setProducts(products.map(p => p.id === product.id ? { ...p, stock_quantity: previousStock } : p));
      toast.error('Failed to restock items');
    }
  };

  // Base metrics
  const newOrders = orders.filter(o => o.status === 'NEW').length;
  const preparing = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const lowStockProducts = products.filter(p => p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity).slice(0, 5);

  // Advanced Smart Insights Calculations
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const aov = todayOrders.length > 0 ? (todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0) / todayOrders.length).toFixed(0) : 0;
  
  const hourCounts = orders.reduce((acc, o) => {
    const hr = new Date(o.created_at).getHours();
    acc[hr] = (acc[hr] || 0) + 1;
    return acc;
  }, {});
  let peakHour = null;
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hr, count]) => {
    if (count > maxCount) { maxCount = count; peakHour = hr; }
  });
  const formatHour = h => h === null ? '--' : (h % 12 || 12) + (h < 12 ? ' AM' : ' PM');

  const customerSpends = orders.reduce((acc, o) => {
    if (o.customer_name) {
      acc[o.customer_name] = (acc[o.customer_name] || 0) + parseFloat(o.total_amount || 0);
    }
    return acc;
  }, {});
  const topCustomer = Object.entries(customerSpends).sort((a,b) => b[1] - a[1])[0];

  const getStatusColor = (status) => {
    const colors = {
      NEW: 'bg-emerald-100 text-emerald-700',
      ACCEPTED: 'bg-blue-100 text-blue-700',
      PREPARING: 'bg-amber-100 text-amber-700',
      READY: 'bg-purple-100 text-purple-700',
      COMPLETED: 'bg-slate-100 text-slate-700',
      REJECTED: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Top Header & Store Status */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Store Overview</h1>
          <p className="text-slate-500 mt-1">Here is what's happening with your store today.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Store Status</span>
            <button 
              onClick={toggleStoreStatus}
              disabled={toggling || !storeSettings}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${storeSettings?.is_open ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} ${toggling ? 'opacity-50' : ''}`}
            >
              <Power size={18} />
              {storeSettings?.is_open ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>
        </div>
      </div>

      {/* Action Center */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/owner/products" className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-slate-700 font-bold group">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><Plus size={18}/></div>
          Add Product
        </Link>
        <Link to="/owner/offers" className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-slate-700 font-bold group">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Tag size={18}/></div>
          Create Offer
        </Link>
        <Link to="/owner/referrals" className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all text-slate-700 font-bold group">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:scale-110 transition-transform"><Gift size={18}/></div>
          Scan Referral
        </Link>
        <Link to="/owner/orders" className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-slate-700 font-bold group">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform"><Activity size={18}/></div>
          Active Orders
        </Link>
      </div>

      {/* Smart Insights (Advanced AI-style features) */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
        <div className="flex items-center gap-2 mb-6">
          <BrainCircuit size={24} className="text-indigo-400" />
          <h2 className="text-xl font-extrabold text-white tracking-tight">Smart Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-indigo-300 mb-2 font-bold text-sm">
              <Target size={16} /> Average Order Value
            </div>
            <p className="text-2xl font-black text-white">?{loading ? '...' : aov}</p>
            <p className="text-xs text-indigo-200/60 mt-1">Based on today's orders</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-indigo-300 mb-2 font-bold text-sm">
              <Clock size={16} /> Peak Ordering Hour
            </div>
            <p className="text-2xl font-black text-white">{loading ? '...' : formatHour(peakHour)}</p>
            <p className="text-xs text-indigo-200/60 mt-1">When most orders arrive</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-indigo-300 mb-2 font-bold text-sm">
              <Users size={16} /> Top Customer
            </div>
            <p className="text-2xl font-black text-white truncate" title={topCustomer ? topCustomer[0] : ''}>
              {loading ? '...' : (topCustomer ? topCustomer[0] : 'None yet')}
            </p>
            <p className="text-xs text-indigo-200/60 mt-1">Highest total spend</p>
          </div>
        </div>
      </div>
      
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
          {newOrders > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full flex items-start justify-end p-3"><div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div></div>}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Needs Approval (New)</p>
              <p className={`text-4xl font-extrabold mt-2 tracking-tight ${newOrders > 0 ? 'text-red-500' : 'text-slate-700'}`}>{loading ? '...' : newOrders}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><PackageSearch size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Preparing</p>
              <p className="text-4xl font-extrabold text-amber-500 mt-2 tracking-tight">{loading ? '...' : preparing}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:scale-110 transition-transform"><Clock size={24}/></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500">Today's Sales</p>
              <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">?{loading || !analytics ? '...' : analytics.today_sales}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><TrendingUp size={24}/></div>
          </div>
        </div>
      </div>

      {/* Split View: Sales Chart & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart (66%) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sales (Last 7 Days)</h2>
            <p className="text-sm font-bold text-slate-500">Total: ?{loading || !analytics ? '...' : analytics.weekly_sales}</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.chart_data || []} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <Line type="monotone" dataKey="Sales" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669' }} activeDot={{ r: 6 }} />
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="5 5" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `?${val}`} />
                <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts (33%) with Quick Restock */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Low Stock Alerts
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center py-8 text-slate-400 font-medium">Checking inventory...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="text-center py-10 bg-emerald-50 rounded-xl border border-dashed border-emerald-200">
                <p className="font-bold text-emerald-600">Inventory is healthy!</p>
                <p className="text-xs text-emerald-500 mt-1">No items are running low.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(product => (
                  <Link key={product.id} to={`/owner/products`} className="flex flex-col p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-200 hover:bg-amber-50 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-white rounded-lg p-1 border border-slate-200 flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold">{product.name.charAt(0)}</div>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 truncate">{product.stock_quantity} {product.unit} left</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-1 rounded-md text-xs font-black ${product.stock_quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {product.stock_quantity === 0 ? 'OUT' : 'LOW'}
                      </span>
                    </div>
                    
                    {/* Quick Restock Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-auto">Restock:</span>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 10)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                      >
                        <PlusCircle size={12} /> 10
                      </button>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 50)}
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                      >
                        <PlusCircle size={12} /> 50
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {lowStockProducts.length > 5 && (
            <Link to="/owner/products" className="mt-4 text-center text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors block border-t border-slate-100 pt-4">
              View all low stock items
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-900">Live Orders</h2>
          <Link to="/owner/orders" className="text-sm font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1">
            View all <ChevronRight size={16}/>
          </Link>
        </div>
        
        {loading && orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Loading recent activity...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="font-bold text-slate-600">No active orders right now.</p>
            <p className="text-sm text-slate-500 mt-1">Once customers place orders, they will appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recentOrders.map(order => (
              <Link key={order.id} to={`/owner/orders/${order.id}`} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">{order.id.split('-').pop()}</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{order.customer_name || 'Guest User'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{order.items_count} items</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="text-base font-black text-emerald-600">?{order.total_amount}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;
