import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PackageSearch, Clock, TrendingUp, ChevronRight, 
  AlertTriangle, Plus, Gift, Tag, Activity,
  BrainCircuit, Users, Target, PlusCircle, User,
  Play, Pause, MapPin, Calendar, CheckCircle2, Circle
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

  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();

  // Metrics
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
  const newOrdersCount = orders.filter(o => o.status === 'NEW').length;
  const preparingCount = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  const totalToday = todayOrders.length || 1; // avoid division by zero
  const pctNew = (newOrdersCount / totalToday) * 100;
  const pctPrep = (preparingCount / totalToday) * 100;
  const pctReady = (readyCount / totalToday) * 100;
  const pctDone = (completedCount / totalToday) * 100;

  const allLowStock = products.filter(p => p.stock_quantity <= 5).sort((a, b) => a.stock_quantity - b.stock_quantity);
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

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

  // Chart Mock Data (Last 7 Days) for the vertical bars
  const chartData = analytics?.chart_data || [
    { name: 'M', Sales: 20 }, { name: 'T', Sales: 45 }, { name: 'W', Sales: 30 },
    { name: 'T', Sales: 80 }, { name: 'F', Sales: 50 }, { name: 'S', Sales: 90 }, { name: 'S', Sales: 40 }
  ];
  const maxSales = Math.max(...chartData.map(d => d.Sales), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      
      {/* Top Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 px-2">
        <div className="space-y-4 flex-1">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
            Welcome in, {ownerName}
          </h1>
          
          {/* Order Status Progress Pills */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-2">
            <div className="flex flex-col gap-2 w-24">
              <span className="text-zinc-500">New</span>
              <div className="h-4 w-full bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-900" style={{ width: `${pctNew}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-24">
              <span className="text-zinc-500">Preparing</span>
              <div className="h-4 w-full bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${pctPrep}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-32 flex-1">
              <span className="text-zinc-500">Ready / Shipped</span>
              <div className="h-4 w-full bg-black/5 rounded-full overflow-hidden bg-stripes">
                <div className="h-full bg-white border border-black/10 rounded-full" style={{ width: `${pctReady}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2 w-20">
              <span className="text-zinc-500">Delivered</span>
              <div className="h-4 w-full bg-black/5 rounded-full overflow-hidden">
                <div className="h-full bg-transparent border-2 border-zinc-900 rounded-full" style={{ width: `${pctDone}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Big Metrics */}
        <div className="flex items-center gap-8 lg:ml-auto">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-zinc-900">{orders.length}</span>
            <span className="text-sm font-bold text-zinc-500 mb-1">Orders</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-zinc-900">{products.length}</span>
            <span className="text-sm font-bold text-zinc-500 mb-1">Products</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-zinc-900">₹{(analytics?.today_sales / 1000).toFixed(1)}k</span>
            <span className="text-sm font-bold text-zinc-500 mb-1">Revenue</span>
          </div>
        </div>
      </div>

      {/* Grid Layout - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Profile Card (Col 1) */}
        <div className="bg-gradient-to-br from-[#ffffff] to-[#f4ecd8] dark:from-zinc-900 dark:to-zinc-800 rounded-3xl p-6 shadow-sm ring-1 ring-black/5 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/20 blur-3xl rounded-full" />
          <div className="w-20 h-20 bg-zinc-200 rounded-2xl mb-4 overflow-hidden border border-white">
            <img src="https://ui-avatars.com/api/?name=Owner&background=random&color=fff&size=150" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="relative z-10 mt-auto">
            <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{ownerName}</h3>
            <p className="text-xs font-bold text-zinc-500">Store Manager</p>
            <div className="mt-4 px-3 py-1.5 bg-black/5 rounded-full inline-flex text-xs font-bold text-zinc-800">
              ID: {loading ? '...' : (analytics?.store_id || 'STR-001')}
            </div>
          </div>
        </div>

        {/* Progress Vertical Bars (Col 2) */}
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Sales Trend</h3>
              <p className="text-xs font-bold text-zinc-500">Last 7 days</p>
            </div>
            <Link to="/owner/sales" className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
              <TrendingUp size={14} className="text-zinc-600" />
            </Link>
          </div>
          
          <div className="flex items-end justify-between h-32 mt-auto gap-2">
            {chartData.map((d, i) => {
              const heightPct = Math.max((d.Sales / maxSales) * 100, 10);
              const isMax = d.Sales === maxSales;
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  {isMax && <span className="text-[10px] font-bold bg-amber-400 px-1.5 py-0.5 rounded text-zinc-900">High</span>}
                  <div className="w-full bg-black/5 rounded-full flex items-end overflow-hidden" style={{ height: '100px' }}>
                    <div className={`w-full rounded-full transition-all duration-1000 ${isMax ? 'bg-amber-400' : 'bg-zinc-800'}`} style={{ height: `${heightPct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{d.name[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Tracker / Peak Hour (Col 3) */}
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-sm ring-1 ring-black/5 flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-zinc-900">Peak Hour</h3>
            <button className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5">
              <Clock size={14} className="text-zinc-600" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {/* Fake Circular Progress */}
            <div className="w-32 h-32 rounded-full border-4 border-black/5 flex flex-col items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="60" fill="none" stroke="#fbbf24" strokeWidth="8" strokeDasharray="377" strokeDashoffset="100" strokeLinecap="round" />
              </svg>
              <span className="text-2xl font-black text-zinc-900">{loading ? '--:--' : formatHour(peakHour)}</span>
              <span className="text-[10px] font-bold text-zinc-400">Max Orders</span>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-4">
            <button className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Play size={12} fill="currentColor" /></button>
            <button className="w-8 h-8 rounded-full border border-black/10 flex items-center justify-center text-zinc-600"><Pause size={12} fill="currentColor" /></button>
          </div>
        </div>

        {/* Right Low Stock (Col 4) */}
        <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-bold">Low Stock</h3>
            <span className="text-2xl font-black text-amber-400">{allLowStock.length}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold text-zinc-400">Critical</span>
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden flex">
              <div className="bg-amber-400 h-full w-1/3 rounded-l-full" />
              <div className="bg-zinc-700 h-full w-1/4 rounded-r-full" />
            </div>
            <span className="text-xs font-bold text-zinc-400">Empty</span>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 pr-2">
            {allLowStock.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center font-bold text-xs">{p.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-400">{p.stock_quantity} left</p>
                </div>
                <Link to="/owner/products" className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center">
                  <Plus size={12} />
                </Link>
              </div>
            ))}
            {allLowStock.length === 0 && <p className="text-xs text-zinc-500 font-bold text-center mt-8">All products are stocked up!</p>}
          </div>
        </div>

      </div>

      {/* Grid Layout - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Links / Actions */}
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-sm ring-1 ring-black/5 space-y-2">
          <h3 className="text-sm font-bold text-zinc-900 mb-4 px-2">Quick Actions</h3>
          {[
            { label: 'Create Offer', icon: Tag, path: '/owner/offers' },
            { label: 'Scan Referral', icon: Gift, path: '/owner/referrals' },
            { label: 'Push Broadcast', icon: Target, path: '/owner/push-broadcast' },
            { label: 'Delivery Fleet', icon: MapPin, path: '/owner/delivery-partners' },
            { label: 'Store Settings', icon: BrainCircuit, path: '/owner/settings' },
          ].map((item, i) => (
            <Link key={i} to={item.path} className="flex items-center justify-between p-3 rounded-2xl hover:bg-black/5 transition-colors border border-transparent hover:border-black/5 group">
              <span className="text-sm font-bold text-zinc-700">{item.label}</span>
              <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white transition-colors">
                <item.icon size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Timeline / Calendar View */}
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-sm ring-1 ring-black/5 lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Calendar size={18} /> Today's Timeline
            </h3>
            <span className="text-xs font-bold text-zinc-500">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>

          <div className="flex-1 overflow-x-auto hide-scrollbar pb-2">
            <div className="min-w-[600px] grid grid-cols-7 gap-2">
              {/* Days Header */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-[10px] font-bold text-zinc-400 text-center uppercase">{day}</div>
              ))}
              
              {/* Calendar Grid (Mocked empty squares + actual orders) */}
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="aspect-square bg-black/5 rounded-2xl relative p-2 flex flex-col">
                  <span className="text-xs font-bold text-zinc-400">{i + 10}</span>
                  {i === 3 && (
                    <div className="absolute inset-x-1 bottom-1 top-6 bg-zinc-900 rounded-xl p-1.5 flex flex-col justify-between shadow-lg z-10 text-white">
                      <span className="text-[9px] font-black leading-tight">Order Rush</span>
                      <span className="text-[8px] text-zinc-400">12:00 - 14:00</span>
                    </div>
                  )}
                  {i === 5 && (
                    <div className="absolute inset-x-1 bottom-1 top-6 bg-amber-400 rounded-xl p-1.5 flex flex-col justify-between shadow-lg z-10 text-zinc-900">
                      <span className="text-[9px] font-black leading-tight">Weekend<br/>Promo</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-black/5 flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-zinc-600"><span className="w-2 h-2 rounded-full bg-zinc-900" /> Peak Traffic</div>
            <div className="flex items-center gap-1.5 text-zinc-600"><span className="w-2 h-2 rounded-full bg-amber-400" /> Promos Active</div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
