import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
 LineChart, Line, XAxis, YAxis, CartesianGrid, 
 Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { PackageSearch, Clock, CheckCircle2, TrendingUp, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import api from '../../services/api';

const Dashboard = () => {
 const [orders, setOrders] = useState([]);
 const [analytics, setAnalytics] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const fetchDashboard = () => {
 api.get('/orders/', { params: { t: Date.now() } })
 .then(res => setOrders(res.data.results || res.data))
 .catch(() => {});
 api.get('/orders/analytics/', { params: { t: Date.now() } })
 .then(res => setAnalytics(res.data))
 .catch(() => {})
 .finally(() => setLoading(false));
 };
 fetchDashboard();
 const interval = setInterval(fetchDashboard, 10000);
 return () => clearInterval(interval);
 }, []);

 const newOrders = orders.filter(o => o.status === 'NEW' || o.status === 'ACCEPTED').length;
 const preparing = orders.filter(o => o.status === 'PREPARING').length;
 const ready = orders.filter(o => o.status === 'READY').length;

 const recentOrders = orders.slice(0, 5);

 return (
 <div className="max-w-7xl mx-auto space-y-8">
 <div>
 <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Good afternoon 👋</h1>
 <p className="text-slate-500 mt-1">Here is what's happening with your store today.</p>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-bold text-slate-500">New Orders</p>
 <p className="text-4xl font-extrabold text-indigo-600 mt-2 tracking-tight">{loading ? '...' : newOrders}</p>
 </div>
 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform"><PackageSearch size={24}/></div>
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
 <p className="text-sm font-bold text-slate-500">Ready</p>
 <p className="text-4xl font-extrabold text-emerald-500 mt-2 tracking-tight">{loading ? '...' : ready}</p>
 </div>
 <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={24}/></div>
 </div>
 </div>
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-bold text-slate-500">Today's Sales</p>
 <p className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">₹{loading || !analytics ? '...' : analytics.today_sales}</p>
 </div>
 <div className="p-3 bg-slate-50 rounded-xl text-slate-600 group-hover:scale-110 transition-transform"><TrendingUp size={24}/></div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-bold text-slate-500">Weekly Sales</p>
 <p className="text-4xl font-extrabold text-indigo-600 mt-2 tracking-tight">₹{loading || !analytics ? '...' : analytics.weekly_sales}</p>
 </div>
 <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform"><CalendarDays size={24}/></div>
 </div>
 </div>
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-bold text-slate-500">Monthly Sales</p>
 <p className="text-4xl font-extrabold text-amber-500 mt-2 tracking-tight">₹{loading || !analytics ? '...' : analytics.monthly_sales}</p>
 </div>
 <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:scale-110 transition-transform"><Calendar size={24}/></div>
 </div>
 </div>
 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group">
 <div className="flex justify-between items-start">
 <div>
 <p className="text-sm font-bold text-slate-500">Yearly Sales</p>
 <p className="text-4xl font-extrabold text-emerald-500 mt-2 tracking-tight">₹{loading || !analytics ? '...' : analytics.yearly_sales}</p>
 </div>
 <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={24}/></div>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
 <h2 className="text-lg font-bold text-gray-900 mb-6">Sales (Last 7 Days)</h2>
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%"height="100%">
 <LineChart data={analytics?.chart_data || []} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
 <Line type="monotone"dataKey="Sales"stroke="#4f46e5"strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
 <CartesianGrid stroke="#f3f4f6"strokeDasharray="5 5"vertical={false} />
 <XAxis dataKey="name"stroke="#9ca3af"fontSize={12} tickLine={false} axisLine={false} />
 <YAxis stroke="#9ca3af"fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
 <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </div>
 </div>

 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-8">
 <div className="flex justify-between items-center mb-6">
 <h2 className="text-xl font-extrabold text-slate-900">Recent Activity</h2>
 <Link to="/owner/orders"className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center">View all <ChevronRight size={16}/></Link>
 </div>
 
 {loading && orders.length === 0 ? (
 <div className="text-center py-8 text-slate-500">Loading recent activity...</div>
 ) : recentOrders.length === 0 ? (
 <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
 <p className="font-medium text-slate-600">No recent activity.</p>
 <p className="text-sm mt-1">Once customers place orders, they will appear here.</p>
 </div>
 ) : (
 <div className="space-y-3">
 {recentOrders.map(order => (
 <Link key={order.id} to={`/owner/orders/${order.id}`} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all">
 <div className="flex items-center gap-4">
 <div className="hidden sm:flex h-12 w-12 rounded-full bg-slate-50 items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
 <PackageSearch size={20} />
 </div>
 <div>
 <p className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">Order #{order.id}</p>
 <p className="text-sm text-slate-500 font-medium">{order.customer_name || `Customer ID: ${order.customer}`}</p>
 </div>
 </div>
 <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
 <div className="text-left sm:text-right">
 <p className="font-extrabold text-slate-900">₹{order.total_amount}</p>
 <p className="text-xs text-slate-400 font-medium">Total value</p>
 </div>
 <div className={`px-3 py-1 rounded-full text-xs font-bold ${
 order.status === 'NEW' ? 'bg-indigo-50 text-indigo-700 ' :
 order.status === 'PREPARING' ? 'bg-amber-50 text-amber-700' :
 order.status === 'READY' ? 'bg-emerald-50 text-emerald-700' :
 'bg-slate-100 text-slate-600 '
 }`}>
 {order.status}
 </div>
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
