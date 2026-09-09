import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Download, QrCode, ShieldCheck, CheckCircle2, 
  Truck, ShoppingBag, ExternalLink, ArrowRight, HelpCircle,
  Sparkles, RefreshCw, Zap, Star, AlertTriangle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from './services/api';

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'delivery'
  const [storeSettings, setStoreSettings] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/store/settings/')
      .then((res) => {
        setStoreSettings(res.data);
      })
      .catch((err) => {
        console.warn('Could not fetch store settings:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const storeName = storeSettings?.store_name || 'Narendra Kirana';
  const customerApkUrl = storeSettings?.app_update_url || 
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana.apk';
  const deliveryApkUrl = 
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana-delivery.apk';

  const currentDownloadUrl = activeTab === 'customer' ? customerApkUrl : deliveryApkUrl;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentDownloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black antialiased">
      {/* Dynamic Ambient Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-emerald-600/20 via-teal-600/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-10 w-[500px] h-[350px] bg-emerald-900/15 blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <a href="https://narendra-kirana.vercel.app" className="flex items-center gap-2.5 text-white group">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-900/30">
              <div className="size-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <ShoppingBag size={20} />
              </div>
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white block">{storeName}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block -mt-0.5">Official Apps</span>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="https://narendra-kirana.vercel.app"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 transition"
            >
              <span>Visit Web Store</span>
              <ExternalLink size={13} />
            </a>
            <a
              href="https://narendra-kirana-delivery.vercel.app"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition"
            >
              <Truck size={13} />
              <span>Rider Portal</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-14 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tracking-wide mb-5 shadow-sm">
          <Sparkles size={14} />
          <span>Latest Official Releases (Android & Web)</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl">
          Get the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">{storeName}</span> App
        </h1>
        <p className="mt-3 sm:mt-4 text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
          Order daily groceries in seconds, track deliveries live on the map, and enjoy exclusive app-only deals and wallet rewards.
        </p>

        {/* Tab Switcher: Customer vs Delivery */}
        <div className="mt-8 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-1.5 max-w-md w-full shadow-xl">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag size={16} />
            <span>Customer App</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck size={16} />
            <span>Delivery Fleet</span>
          </button>
        </div>

        {/* Main App Showcase Card */}
        <div className="mt-8 w-full max-w-3xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-left">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: App Info & Download CTA */}
            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`size-14 rounded-2xl p-0.5 shadow-lg ${
                    activeTab === 'customer'
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/20'
                      : 'bg-gradient-to-tr from-indigo-500 to-purple-400 shadow-indigo-500/20'
                  }`}>
                    <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                      {activeTab === 'customer' ? (
                        <ShoppingBag size={28} className="text-emerald-400" />
                      ) : (
                        <Truck size={28} className="text-indigo-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {activeTab === 'customer' ? `${storeName} Customer App` : `${storeName} Rider App`}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-emerald-400">v1.0.0 (Latest)</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-semibold text-slate-400">Android 8.0+</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-semibold text-slate-400">~28 MB</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  {activeTab === 'customer'
                    ? 'Get instant groceries delivered to your doorstep in minutes. Real-time delivery tracking, 1-click UPI payments, and digital receipts.'
                    : 'The official delivery partner app for Narendra Kirana riders. Accept delivery orders, navigate with GPS, collect payments, and track daily earnings.'}
                </p>

                {/* Feature Highlights Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-8">
                  {activeTab === 'customer' ? (
                    <>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <Zap size={14} className="text-amber-400 shrink-0" />
                        <span>Instant 10-20m Delivery</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <span>1-Tap UPI & Cash</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <Star size={14} className="text-yellow-400 shrink-0" />
                        <span>Loyalty Wallet Rewards</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                        <span>100% Genuine Products</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <Zap size={14} className="text-amber-400 shrink-0" />
                        <span>Real-Time Order Alerts</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />
                        <span>GPS Map Routing</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <Star size={14} className="text-yellow-400 shrink-0" />
                        <span>Instant Earnings Summary</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        <ShieldCheck size={14} className="text-cyan-400 shrink-0" />
                        <span>Verified Fleet Security</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href={currentDownloadUrl}
                  download
                  className={`inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm text-white shadow-xl transition-all active:scale-95 cursor-pointer ${
                    activeTab === 'customer'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-950/60'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 shadow-indigo-950/60'
                  }`}
                >
                  <Download size={18} className="stroke-[2.5]" />
                  <span>Download Android APK</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-extrabold border border-slate-700/80 transition-all text-center cursor-pointer"
                >
                  {copied ? '✔ Link Copied!' : 'Copy Download Link'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-3.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Verified Clean & Malware-Free • Direct official release</span>
              </div>
            </div>

            {/* Right: QR Code for Mobile Scanning */}
            <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-center">
              <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-200 mb-3 flex items-center justify-center">
                <QRCodeSVG
                  value={currentDownloadUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                  className="size-36 sm:size-40"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-black text-white mb-0.5">
                <QrCode size={14} className="text-emerald-400" />
                <span>Scan with Phone Camera</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Scan with your Android camera to start direct download immediately.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <section className="mt-14 w-full max-w-3xl text-left">
          <div className="text-center mb-6">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              How to Install on Android
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Easy 3-step setup in under 30 seconds
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                1
              </div>
              <h4 className="text-sm font-extrabold text-white mb-1">Download the APK</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click the "Download Android APK" button above or scan the QR code.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                2
              </div>
              <h4 className="text-sm font-extrabold text-white mb-1">Allow Unknown Sources</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                When prompted by Android, tap "Settings" and toggle "Allow from this source".
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                3
              </div>
              <h4 className="text-sm font-extrabold text-white mb-1">Open & Start Shopping</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap "Install" & open the app. Sign in with your mobile number or Google account!
              </p>
            </div>
          </div>
        </section>

        {/* Direct Web Portal Links */}
        <section className="mt-10 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 max-w-3xl w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Don't want to install an APK?</p>
              <p className="text-[11px] text-slate-400">You can use our lightweight Web Store directly in any browser.</p>
            </div>
          </div>
          <a
            href="https://narendra-kirana.vercel.app"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition shrink-0"
          >
            <span>Open Web Store</span>
            <ArrowRight size={14} />
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {storeName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
