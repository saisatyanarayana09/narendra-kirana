import React, { useState, useEffect } from 'react';
import { Download, ShoppingBag } from 'lucide-react';
import api from './services/api';

export default function DownloadPage() {
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
  const downloadUrl = storeSettings?.app_update_url ||
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana.apk';
  const version = storeSettings?.latest_mobile_version || 'v1.0.4';

  const changelogs = [
    'Real-time live driver delivery tracking with map ETA',
    '1-tap Dynamic UPI QR payments (GPay, PhonePe, Paytm, Cash)',
    'Wallet cashback rewards and instant referral bonuses',
    'Faster app startup time and smoother cart checkout flow',
    'Minor bug fixes and stability enhancements',
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 antialiased font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* 1. App Logo */}
        <div className="size-24 rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-950/50">
          <ShoppingBag size={48} />
        </div>

        {/* 2. Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {storeName}
          </h1>

          {/* 3. Version */}
          <p className="text-sm font-bold text-emerald-400 mt-1">
            Version {version}
          </p>
        </div>

        {/* 4. Download Button */}
        <a
          href={downloadUrl}
          download
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/60 transition cursor-pointer"
        >
          <Download size={20} className="stroke-[2.5]" />
          <span>Download APK</span>
        </a>

        {/* 5. Changelogs */}
        <div className="w-full pt-6 border-t border-slate-800 text-left">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
            Changelogs
          </h2>
          <ul className="space-y-2.5">
            {changelogs.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
