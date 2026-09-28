import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { 
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Plus, Gift, Tag, Activity,
  PlusCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import ProductFormModal from '../components/ProductFormModal';

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

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

  const handleQuickAction = async (e, orderId, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (newStatus === 'REJECTED') {
      if (!window.confirm('Are you sure you want to reject this order?')) return;
    }
    
    // Optimistic UI for quick action
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    
    try {
      await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to update order status');
      fetchDashboardData();
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
      <div className="bg-white dark:bg-[#0d1322] px-6 py-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{greeting}, {ownerName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            You have <span className="font-semibold text-slate-700 dark:text-slate-300">{pendingCount}</span> active {pendingCount === 1 ? 'order' : 'orders'} in the queue today.
          </p>
        </div>
      </div>

      {/* Quick Access Hub */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setIsProductModalOpen(true)} className="flex items-center gap-3 p-4 bg-white dark:bg-[#0d1322] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-left">
          <div className="text-slate-500 dark:text-slate-400"><Plus size={18}/></div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Add Product</span>
        </button>
        <Link to="/owner/orders" className="flex items-center gap-3 p-4 bg-white dark:bg-[#0d1322] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
          <div className="text-slate-500 dark:text-slate-400"><Activity size={18}/></div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Active Orders</span>
        </Link>
        <Link to="/owner/offers" className="flex items-center gap-3 p-4 bg-white dark:bg-[#0d1322] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
          <div className="text-slate-500 dark:text-slate-400"><Tag size={18}/></div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Create Offer</span>
        </Link>
        <Link to="/owner/push-broadcast" className="flex items-center gap-3 p-4 bg-white dark:bg-[#0d1322] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
          <div className="text-slate-500 dark:text-slate-400"><Gift size={18}/></div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Push Broadcast</span>
        </Link>
      </div>
      
      {/* Primary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/owner/orders" className="bg-white dark:bg-[#0d1322] p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between h-32">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Needs Approval</p>
            <PackageSearch size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">{loading ? '...' : newOrders}</p>
        </Link>

        <Link to="/owner/orders" className="bg-white dark:bg-[#0d1322] p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between h-32">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Preparing Now</p>
            <Clock size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">{loading ? '...' : preparing}</p>
        </Link>

        <div className="bg-white dark:bg-[#0d1322] p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all flex flex-col justify-between h-32">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today's Sales</p>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          <p className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">₹{loading || !analytics ? '...' : analytics.today_sales}</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-[#0d1322] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              Low Stock Alerts
            </h2>
            <AlertTriangle size={18} className="text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">Loading...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-center p-6 text-slate-500">
                <p className="font-medium text-sm">Inventory is healthy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex flex-col p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <Link to="/owner/products" className="flex items-center justify-between group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded p-1 border border-slate-100 dark:border-slate-700 flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">{product.name.charAt(0)}</div>
                          )}
                        </div>
                        <div className="overflow-hidden pr-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{product.stock_quantity} {product.unit} left</p>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${product.stock_quantity === 0 ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {product.stock_quantity === 0 ? 'OUT' : 'LOW'}
                      </span>
                    </Link>
                    
                    <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-50 dark:border-slate-800/50">
                      <span className="text-[10px] font-medium text-slate-400 uppercase mr-auto">Restock</span>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 10)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        +10
                      </button>
                      <button 
                        onClick={(e) => handleQuickRestock(e, product, 50)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                      >
                        +50
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0d1322] rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live Orders</h2>
            <Link to="/owner/orders" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
              View all
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {loading && orders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-slate-400 text-sm">Loading...</div>
            ) : recentOrders.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center p-6 text-slate-500">
                <p className="font-medium text-sm">No active orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentOrders.map(order => (
                  <div key={order.id} className="flex flex-col p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                    <Link to={`/owner/orders/${order.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{order.id.split('-').pop()}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{order.customer_name || 'Guest User'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{order.items_count} items</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-end">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <div className="flex items-center gap-2">
                          {order.payment_method === 'UPI' && (
                            <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">UPI</span>
                          )}
                          <span className="text-sm font-bold text-slate-900 dark:text-white">₹{order.total_amount}</span>
                        </div>
                      </div>
                    </Link>

                    {/* Quick Actions */}
                    {order.status === 'NEW' && (
                      <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'ACCEPTED')}
                          className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'REJECTED')}
                          className="py-1.5 px-2 bg-white text-rose-600 border border-slate-200 hover:bg-rose-50 rounded text-xs font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, 'PREPARING')}
                          className="w-full py-1.5 px-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded transition-colors"
                        >
                          Start Preparing
                        </button>
                      </div>
                    )}
                    {order.status === 'PREPARING' && (
                      <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/50">
                        <button 
                          onClick={(e) => handleQuickAction(e, order.id, order.order_type === 'PICKUP' ? 'READY' : 'OUT_FOR_DELIVERY')}
                          className="w-full py-1.5 px-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded transition-colors"
                        >
                          {order.order_type === 'PICKUP' ? 'Ready for Pickup' : 'Out for Delivery'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductFormModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onSaveSuccess={fetchDashboardData} 
      />
    </div>
  );
};

export default Dashboard;
