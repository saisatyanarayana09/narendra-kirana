import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { 
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Plus, Gift, Tag, Activity,
  PlusCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      if (!document.hidden) fetchDashboardData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, analyticsRes, productsRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/orders/analytics/'),
        api.get('/products/?limit=100')
      ]);
      setOrders(ordersRes.data.results || ordersRes.data);
      setAnalytics(analyticsRes.data);
      setProducts(productsRes.data.results || productsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
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
  const allLowStock = products.filter(p => p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const lowStockProducts = allLowStock.slice(0, 5);


  const getStatusColor = (status) => {
    const colors = {
      NEW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      ACCEPTED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      PREPARING: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      READY: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
      COMPLETED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300';
  };


  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';
  
  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();
  
  const pendingCount = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Welcome Header */}
      <div className="bg-white dark:bg-[#0d1322] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{greeting}, {ownerName}! {emoji}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          You have <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingCount}</span> active {pendingCount === 1 ? 'order' : 'orders'} in the queue today.
        </p>
      </div>

      {/* Quick Access Hub */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/owner/products" className="flex flex-col items-center justify-center gap-3 p-5 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Plus size={24}/></div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Add Product</span>
        </Link>
        <Link to="/owner/orders" className="flex flex-col items-center justify-center gap-3 p-5 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Activity size={24}/></div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Active Orders</span>
        </Link>
        <Link to="/owner/offers" className="flex flex-col items-center justify-center gap-3 p-5 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Tag size={24}/></div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Create Offer</span>
        </Link>
        <Link to="/owner/push-broadcast" className="flex flex-col items-center justify-center gap-3 p-5 bg-white dark:bg-[#0d1322] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all group">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><Gift size={24}/></div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Push Broadcast</span>
        </Link>
      </div>
      
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/owner/orders" className="bg-white dark:bg-[#0d1322] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md hover:border-red-200 dark:hover:border-red-900/50 group block">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Needs Approval</p>
              <p className={`text-5xl font-black mt-3 tracking-tight ${newOrders > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{loading ? '...' : newOrders}</p>
            </div>
            <div className={`p-4 rounded-2xl ${newOrders > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
              <PackageSearch size={28}/>
            </div>
          </div>
        </Link>

        <Link to="/owner/orders" className="bg-white dark:bg-[#0d1322] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md hover:border-amber-200 dark:hover:border-amber-900/50 group block">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Preparing Now</p>
              <p className="text-5xl font-black text-amber-500 mt-3 tracking-tight">{loading ? '...' : preparing}</p>
            </div>
            <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
              <Clock size={28}/>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-[#0d1322] p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Today's Sales</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">₹{loading || !analytics ? '...' : analytics.today_sales}</p>
            </div>
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={28}/>
            </div>
          </div>
        </div>
      </div>

      {/* Split View: Sales Chart & Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart (66%) */}
        <div className="bg-white dark:bg-[#0d1322] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 xl:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Sales (Last 7 Days)</h2>
            <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Total: ₹{loading || !analytics ? '...' : analytics.weekly_sales}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.chart_data || []} margin={{ top: 10, right: 15, bottom: 5, left: 10 }}>
                <Line type="monotone" dataKey="Sales" stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="6 6" vertical={false} className="dark:opacity-10" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  cursor={{ fill: 'transparent', stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }} 
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales']}
                  contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px', fontWeight: 'bold' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts (33%) with Quick Restock */}
        <div className="bg-white dark:bg-[#0d1322] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle size={22} className="text-amber-500" />
              Low Stock Alerts
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 font-medium">Checking inventory...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/50 p-6 text-center">
                <p className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">Inventory is healthy!</p>
                <p className="text-sm font-medium text-emerald-600/70 dark:text-emerald-400/70 mt-2">No items are running low.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Link to="/owner/products" className="flex items-center justify-between mb-3 group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl p-1.5 border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold">{product.name.charAt(0)}</div>
                          )}
                        </div>
                        <div className="overflow-hidden pr-2">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{product.name}</p>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate mt-0.5">{product.stock_quantity} {product.unit} left</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider ${product.stock_quantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'}`}>
                        {product.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </Link>
                    
                    {/* Quick Restock Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700 mt-1">
                      <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-auto">Restock</span>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 10)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm"
                      >
                        <PlusCircle size={14} /> 10
                      </button>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 50)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-300 dark:hover:border-emerald-700 transition-all shadow-sm"
                      >
                        <PlusCircle size={14} /> 50
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {allLowStock.length > 5 && (
            <Link to="/owner/products" className="mt-5 text-center text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors block">
              View all {allLowStock.length} low stock items &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#0d1322] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Live Orders</h2>
          <Link to="/owner/orders" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors flex items-center gap-1">
            View all <ChevronRight size={16}/>
          </Link>
        </div>
        
        {loading && orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">Loading recent activity...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="font-bold text-slate-600 dark:text-slate-300">No active orders right now.</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Once customers place orders, they will appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recentOrders.map(order => (
              <Link key={order.id} to={`/owner/orders/${order.id}`} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">{order.id.split('-').pop()}</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{order.customer_name || 'Guest User'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.items_count} items</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{order.total_amount}</span>
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
