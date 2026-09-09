import React, { useState, useEffect } from 'react';
import { Download, ShoppingBag, Truck, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import api from './services/api';

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'delivery'
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    api.get('/store/settings/')
      .then((res) => {
        setStoreSettings(res.data);
      })
      .catch((err) => {
        console.warn('Could not fetch store settings:', err);
      });
  }, []);

  const storeName = storeSettings?.store_name || 'Narendra Kirana';
  const customerApkUrl = storeSettings?.app_update_url ||
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana.apk';
  const deliveryApkUrl =
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana-delivery.apk';

  const apps = {
    customer: {
      title: `${storeName}`,
      subtitle: 'Customer Grocery App',
      version: 'v1.0.4',
      releaseDate: 'September 2026',
      fileSize: '28.4 MB',
      downloadUrl: customerApkUrl,
      icon: ShoppingBag,
      accentGradient: 'from-emerald-500 to-teal-400',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glowColor: 'from-emerald-600/20 via-teal-600/10 to-transparent',
      changelogs: [
        'Real-time live driver delivery tracking with map ETA',
        '1-tap Dynamic UPI QR payments (GPay, PhonePe, Paytm, Cash)',
        'Wallet cashback rewards & instant referral bonuses',
        'Faster app startup time and smoother cart checkout flow',
        'Minor bug fixes and performance enhancements',
      ],
    },
    delivery: {
      title: `${storeName} Fleet`,
      subtitle: 'Delivery Partner App',
      version: 'v1.0.4',
      releaseDate: 'September 2026',
      fileSize: '27.8 MB',
      downloadUrl: deliveryApkUrl,
      icon: Truck,
      accentGradient: 'from-indigo-500 to-cyan-400',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/60',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      glowColor: 'from-indigo-600/20 via-cyan-600/10 to-transparent',
      changelogs: [
        'High-priority audio alerts for newly assigned deliveries',
        'Turn-by-turn Google Maps navigation to customer doorsteps',
        'Secure 4-digit OTP delivery confirmation & payment collection',
        'Offline-resilient sync for areas with low network connectivity',
        'Daily shift earnings and completed trips breakdown',
      ],
    },
  };

  const currentApp = apps[activeTab];
  const IconComponent = currentApp.icon;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-black antialiased font-sans">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b ${currentApp.glowColor} blur-3xl opacity-60 transition-all duration-500`}
        />
      </div>

      {/* Minimal Top Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md">
            <div className="size-full bg-slate-950 rounded-[10px] flex items-center justify-center text-emerald-400">
              <ShoppingBag size={18} />
            </div>
          </div>
          <span className="font-black text-sm text-white tracking-tight">{storeName}</span>
        </div>

        <a
          href="https://narendra-kirana.vercel.app"
          className="text-xs font-bold text-slate-400 hover:text-emerald-400 transition flex items-center gap-1"
        >
          <span>Web Store</span>
          <ArrowRight size={13} />
        </a>
      </header>

      {/* Main Download Unit */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16 w-full max-w-xl mx-auto">
        {/* Tab Switcher: Customer vs Delivery Partner */}
        <div className="w-full max-w-xs p-1 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-1 shadow-xl mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={14} />
            <span>Customer App</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck size={14} />
            <span>Rider App</span>
          </button>
        </div>

        {/* Core App Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
          {/* 1. App Logo */}
          <div className={`size-24 rounded-3xl p-1 bg-gradient-to-tr ${currentApp.accentGradient} shadow-2xl shadow-black/60 mb-5`}>
            <div className="size-full bg-slate-950 rounded-[20px] flex items-center justify-center text-white">
              <IconComponent size={44} className={activeTab === 'customer' ? 'text-emerald-400' : 'text-indigo-400'} />
            </div>
          </div>

          {/* 2. Title & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {currentApp.title}
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {currentApp.subtitle}
          </p>

          {/* 3. Version & File Details */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black border mt-3 mb-6 bg-slate-950/80 border-slate-800 text-slate-300">
            <span className="text-emerald-400 font-extrabold">{currentApp.version}</span>
            <span className="text-slate-600">•</span>
            <span>{currentApp.fileSize}</span>
            <span className="text-slate-600">•</span>
            <span>Android 8.0+</span>
          </div>

          {/* 4. Download Button */}
          <a
            href={currentApp.downloadUrl}
            download
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-xl cursor-pointer ${currentApp.buttonBg}`}
          >
            <Download size={20} className="stroke-[2.5]" />
            <span>Download APK ({currentApp.fileSize})</span>
          </a>

          {/* 5. Changelogs (What's New) */}
          <div className="w-full mt-7 pt-6 border-t border-slate-800/80 text-left">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              <Sparkles size={14} className="text-amber-400" />
              <span>What's New in {currentApp.version}</span>
            </div>

            <ul className="space-y-2">
              {currentApp.changelogs.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                  <CheckCircle2
                    size={15}
                    className={`shrink-0 mt-0.5 ${activeTab === 'customer' ? 'text-emerald-400' : 'text-indigo-400'}`}
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-slate-950/80 py-4 px-4 text-center text-[11px] text-slate-500">
        © {new Date().getFullYear()} {storeName}. All rights reserved.
      </footer>
    </div>
  );
}
