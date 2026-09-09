import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { CartProvider } from './cart-context';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from 'react-hot-toast';
import { WifiOff } from 'lucide-react';

import { VerifyEmail } from './VerifyEmail';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import { lazyWithRetry } from './utils/lazyWithRetry';

const HomePage = lazyWithRetry(() => import('./customer').then(m => ({ default: m.HomePage })));
const ProductDetailPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m.ProductDetailPage })));
const ProductsPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = lazyWithRetry(() => import('./customer').then(m => ({ default: m.CategoriesPage })));

const CartPage = lazyWithRetry(() => import('./cart').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazyWithRetry(() => import('./cart').then(m => ({ default: m.CheckoutPage })));
const CustomerLoginPage = lazyWithRetry(() => import('./cart').then(m => ({ default: m.CustomerLoginPage })));
const CustomerSignupPage = lazyWithRetry(() => import('./cart').then(m => ({ default: m.CustomerSignupPage })));
const OrderDetailPage = lazyWithRetry(() => import('./cart').then(m => ({ default: m.OrderDetailPage })));
const CustomerLayout = lazyWithRetry(() => import('./customer-layout').then(m => ({ default: m.CustomerLayout })));

const ProfileLayout = lazyWithRetry(() => import('./profile').then(m => ({ default: m.ProfileLayout })));
const DashboardHome = lazyWithRetry(() => import('./profile').then(m => ({ default: m.DashboardHome })));
const AccountSettings = lazyWithRetry(() => import('./profile').then(m => ({ default: m.AccountSettings })));
const OrdersHistory = lazyWithRetry(() => import('./profile').then(m => ({ default: m.OrdersHistory })));
const SavedAddresses = lazyWithRetry(() => import('./profile').then(m => ({ default: m.SavedAddresses })));
const Favorites = lazyWithRetry(() => import('./profile').then(m => ({ default: m.Favorites })));
const Notifications = lazyWithRetry(() => import('./profile').then(m => ({ default: m.Notifications })));
const CustomerFeedback = lazyWithRetry(() => import('./profile').then(m => ({ default: m.Feedback })));
const HelpCenter = lazyWithRetry(() => import('./profile').then(m => ({ default: m.HelpCenter })));
const Wallet = lazyWithRetry(() => import('./profile').then(m => ({ default: m.Wallet })));
const ReferAndEarn = lazyWithRetry(() => import('./profile').then(m => ({ default: m.ReferAndEarn })));
const AppSettings = lazyWithRetry(() => import('./profile').then(m => ({ default: m.AppSettings })));
const OffersPromoCodes = lazyWithRetry(() => import('./profile').then(m => ({ default: m.OffersPromoCodes })));
const LanguageSettings = lazyWithRetry(() => import('./profile').then(m => ({ default: m.LanguageSettings })));

const OwnerLayout = lazyWithRetry(() => import('./owner/layouts/OwnerLayout'));
const OwnerLogin = lazyWithRetry(() => import('./owner/pages/Login'));
const OwnerForgotPassword = lazyWithRetry(() => import('./owner/pages/ForgotPassword'));
const OwnerResetPassword = lazyWithRetry(() => import('./owner/pages/ResetPassword'));
const Welcome = lazyWithRetry(() => import('./owner/pages/Welcome'));
const Dashboard = lazyWithRetry(() => import('./owner/pages/Dashboard'));
const Sales = lazyWithRetry(() => import('./owner/pages/Sales'));
const Categories = lazyWithRetry(() => import('./owner/pages/Categories'));
const Products = lazyWithRetry(() => import('./owner/pages/Products'));
const Orders = lazyWithRetry(() => import('./owner/pages/Orders'));
const OrderDetails = lazyWithRetry(() => import('./owner/pages/OrderDetails'));
const Invoice = lazyWithRetry(() => import('./owner/pages/Invoice'));
const Invoices = lazyWithRetry(() => import('./owner/pages/Invoices'));
const Offers = lazyWithRetry(() => import('./owner/pages/Offers'));
const Referrals = lazyWithRetry(() => import('./owner/pages/Referrals'));
const Customers = lazyWithRetry(() => import('./owner/pages/Customers'));
const Feedback = lazyWithRetry(() => import('./owner/pages/Feedback'));
const Settings = lazyWithRetry(() => import('./owner/pages/Settings'));
const AdvancedSettings = lazyWithRetry(() => import('./owner/pages/AdvancedSettings'));
const Showcase = lazyWithRetry(() => import('./owner/pages/Showcase'));
const DeliveryPartners = lazyWithRetry(() => import('./owner/pages/DeliveryPartners'));

const DeliveryLogin = lazyWithRetry(() => import('./delivery/DeliveryLogin'));
const DeliveryGuard = lazyWithRetry(() => import('./delivery/DeliveryGuard'));
const DeliveryLayout = lazyWithRetry(() => import('./delivery/DeliveryLayout'));
const DeliveryDashboard = lazyWithRetry(() => import('./delivery/DeliveryDashboard'));
const DeliveryHistory = lazyWithRetry(() => import('./delivery/DeliveryHistory'));
const DeliveryProfile = lazyWithRetry(() => import('./delivery/DeliveryProfile'));
const DownloadPage = lazyWithRetry(() => import('./DownloadPage'));


const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

const getValidAuthToken = (prefix) => {
  const token = localStorage.getItem(`${prefix}-token`);
  const refresh = localStorage.getItem(`${prefix}-refresh`);

  if (!token && !refresh) {
    return null;
  }

  // If access token is still unexpired, user is validly authenticated
  if (token && !isTokenExpired(token)) {
    return token;
  }

  // If access token expired but refresh token exists and is not expired,
  // the axios interceptor can refresh the session seamlessly.
  if (refresh && !isTokenExpired(refresh)) {
    return refresh;
  }

  // Both access and refresh are expired or invalid -> purge stale credentials
  localStorage.removeItem(`${prefix}-token`);
  localStorage.removeItem(`${prefix}-refresh`);
  localStorage.removeItem(`${prefix}-user`);
  localStorage.removeItem(`${prefix}-username`);
  return null;
};

const ownerToken = () => getValidAuthToken('smart-kirana-owner');
const customerToken = () => getValidAuthToken('smart-kirana-customer');

function Guard({ children, isOwnerDomain = false }) {
  const location = useLocation();
  // Bypass auth check when running under Cypress tests
  if (typeof window !== 'undefined' && window.Cypress) {
    return children;
  }
  const loginPath = isOwnerDomain ? "/login" : "/owner/login";
  return ownerToken() ? children : <Navigate to={loginPath} state={{ from: location }} replace />;
}

function CustomerGuard({ children }) {
  const location = useLocation();
  if (typeof window !== 'undefined' && window.Cypress) {
    return children;
  }
  if (!customerToken()) {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} state={{ from: location }} replace />;
  }
  return children;
}

function CustomerApp() {
 return (
   <>
     <OfflineBanner />
     <CartProvider>
       <Outlet />
     </CartProvider>
   </>
 );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /loading chunk .* failed/i.test(error?.message || '') ||
      /error loading dynamically imported module/i.test(error?.message || '');

    if (isChunkError) {
      const ebCount = Number(sessionStorage.getItem('eb_chunk_reload_count') || 0);
      if (ebCount < 1) {
        sessionStorage.setItem('eb_chunk_reload_count', '1');
        window.location.reload();
        return;
      }
      console.warn('ErrorBoundary: Max reload attempt reached. Displaying recovery UI.');
    }
  }

  handleHardReload = async () => {
    try {
      sessionStorage.removeItem('eb_chunk_reload_count');
      sessionStorage.removeItem('lazy_chunk_retry_count');
      sessionStorage.removeItem('vite_preload_reload_count');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Error clearing caches on reload:', e);
    }
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl + '?ts=' + Date.now();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.name === 'ChunkLoadError' ||
        /failed to fetch dynamically imported module/i.test(this.state.error?.message || '') ||
        /loading chunk .* failed/i.test(this.state.error?.message || '') ||
        /error loading dynamically imported module/i.test(this.state.error?.message || '');

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
              {isChunkError ? '🔄' : '⚠️'}
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
              {isChunkError ? 'New Update Available!' : 'Oops, something went wrong'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              {isChunkError
                ? 'We just updated Narendra Kirana with new improvements. Please reload to apply the latest version.'
                : 'An unexpected error occurred. Please reload the page to continue shopping.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                Reload Narendra Kirana
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              >
                Go to Homepage
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 cursor-pointer">
                <summary className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Technical Details</summary>
                <p className="font-mono break-all text-[11px]">{this.state.error.toString()}</p>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
      <WifiOff size={16} /> You are offline. Please check your internet connection.
    </div>
  );
}

function App() {
  const isDeliveryDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('delivery') ||
    window.location.hostname.startsWith('delivery.')
  );

  const isDownloadDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('download') ||
    window.location.hostname.startsWith('download.')
  );

  const isOwnerDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('owner') ||
    window.location.hostname.includes('admin') ||
    window.location.hostname.startsWith('owner.') ||
    window.location.hostname.startsWith('admin.')
  );

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Toaster position="top-center" toastOptions={{ style: { borderRadius: '12px', background: '#333', color: '#fff' } }} />
            <Suspense fallback={null}>
              {isOwnerDomain ? (
                <Routes>
                  <Route path="/login" element={<OwnerLogin />} />
                  <Route path="/owner/login" element={<OwnerLogin />} />
                  <Route path="/forgot-password" element={<OwnerForgotPassword />} />
                  <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
                  <Route path="/reset-password" element={<OwnerResetPassword />} />
                  <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
                  <Route path="/welcome" element={<Guard isOwnerDomain><Welcome /></Guard>} />
                  <Route path="/owner/welcome" element={<Guard isOwnerDomain><Welcome /></Guard>} />

                  <Route element={<Guard isOwnerDomain><OwnerLayout /></Guard>}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/owner" element={<Dashboard />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/owner/sales" element={<Sales />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/owner/categories" element={<Categories />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/owner/products" element={<Products />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/owner/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetails />} />
                    <Route path="/owner/orders/:id" element={<OrderDetails />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/owner/invoices" element={<Invoices />} />
                    <Route path="/offers" element={<Offers />} />
                    <Route path="/owner/offers" element={<Offers />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/owner/referrals" element={<Referrals />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/owner/customers" element={<Customers />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/owner/feedback" element={<Feedback />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/owner/settings" element={<Settings />} />
                    <Route path="/advanced-settings" element={<AdvancedSettings />} />
                    <Route path="/owner/advanced-settings" element={<AdvancedSettings />} />
                    <Route path="/showcase" element={<Showcase />} />
                    <Route path="/owner/showcase" element={<Showcase />} />
                    <Route path="/delivery-partners" element={<DeliveryPartners />} />
                    <Route path="/owner/delivery-partners" element={<DeliveryPartners />} />
                  </Route>

                  <Route path="/orders/:id/invoice" element={<Guard isOwnerDomain><Invoice /></Guard>} />
                  <Route path="/owner/orders/:id/invoice" element={<Guard isOwnerDomain><Invoice /></Guard>} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : isDeliveryDomain ? (
                <Routes>
                  <Route path="/login" element={<DeliveryLogin />} />
                  <Route path="/delivery/login" element={<Navigate to="/login" replace />} />
                  <Route element={<DeliveryGuard><DeliveryLayout /></DeliveryGuard>}>
                    <Route path="/" element={<DeliveryDashboard />} />
                    <Route path="/delivery" element={<Navigate to="/" replace />} />
                    <Route path="/history" element={<DeliveryHistory />} />
                    <Route path="/delivery/history" element={<Navigate to="/history" replace />} />
                    <Route path="/profile" element={<DeliveryProfile />} />
                    <Route path="/delivery/profile" element={<Navigate to="/profile" replace />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : isDownloadDomain ? (
                <Routes>
                  <Route path="/" element={<DownloadPage />} />
                  <Route path="/download" element={<Navigate to="/" replace />} />
                  <Route path="/downloads" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              ) : (
                <Routes>
                  {/* Customer Routes with CartProvider */}
                  <Route element={<CustomerApp />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/download" element={<DownloadPage />} />
                    <Route path="/downloads" element={<DownloadPage />} />
                    <Route path="/checkout" element={<CustomerGuard><CheckoutPage /></CustomerGuard>} />
                    <Route path="/orders/:id" element={<CustomerGuard><OrderDetailPage /></CustomerGuard>} />
                    <Route path="/order/:id" element={<CustomerGuard><OrderDetailPage /></CustomerGuard>} />
                    <Route path="/orders/:id/invoice" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    <Route path="/order/:id/invoice" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    <Route path="/invoice/:id" element={<CustomerGuard><Invoice /></CustomerGuard>} />
                    
                    {/* Modular Customer Profile */}
                    <Route path="/profile" element={<CustomerGuard><ProfileLayout /></CustomerGuard>}>
                      <Route index element={<DashboardHome />} />
                      <Route path="account" element={<AccountSettings />} />
                      <Route path="orders" element={<OrdersHistory />} />
                      <Route path="addresses" element={<SavedAddresses />} />
                      <Route path="favorites" element={<Favorites />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="feedback" element={<CustomerFeedback />} />
                      <Route path="help" element={<HelpCenter />} />
                      <Route path="wallet" element={<Wallet />} />
                      <Route path="refer-and-earn" element={<ReferAndEarn />} />
                      <Route path="settings" element={<AppSettings />} />
                      <Route path="offers" element={<OffersPromoCodes />} />
                      <Route path="language" element={<LanguageSettings />} />
                    </Route>
                    
                    <Route path="/settings" element={<CustomerLayout><main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[70vh]"><AppSettings /></main></CustomerLayout>} />
                    <Route path="/offers" element={<CustomerGuard><Navigate to="/profile/offers" replace /></CustomerGuard>} />
                    <Route path="/notifications" element={<Navigate to="/profile/notifications" replace />} />
                    
                    <Route path="/login" element={<CustomerLoginPage />} />
                    <Route path="/signup" element={<CustomerSignupPage />} />
                  </Route>

                  {/* Public Auth & Password Recovery Routes (Completely decoupled from CartProvider & background fetches) */}
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Owner Portal Routes (No CartProvider needed) */}
                  <Route path="/owner/login" element={<OwnerLogin />} />
                  <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
                  <Route path="/owner/reset-password" element={<OwnerResetPassword />} />
                  <Route path="/owner/welcome" element={<Guard><Welcome /></Guard>} />
                  
                  <Route path="/owner" element={<Guard><OwnerLayout /></Guard>}>
                    <Route index element={<Dashboard />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="products" element={<Products />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetails />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="offers" element={<Offers />} />
                    <Route path="referrals" element={<Referrals />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="advanced-settings" element={<AdvancedSettings />} />
                    <Route path="showcase" element={<Showcase />} />
                    <Route path="delivery-partners" element={<DeliveryPartners />} />
                  </Route>

                  <Route path="/owner/orders/:id/invoice" element={<Guard><Invoice /></Guard>} />

                  {/* Delivery Partner routes removed from customer domain - redirects to root */}
                  <Route path="/delivery/*" element={<Navigate to="/" replace />} />
                  <Route path="/delivery" element={<Navigate to="/" replace />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
