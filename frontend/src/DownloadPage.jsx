import React, { useState, useEffect } from 'react';
import { Download, Package } from 'lucide-react';
import api from './services/api';

export default function DownloadPage() {
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/store/settings/')
      .then((res) => setStoreSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const appName = storeSettings?.app_name || storeSettings?.store_name || 'Narendra Kirana';
  const directApkUrl = 'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana.apk';
  const downloadUrl = (storeSettings?.app_update_url && storeSettings.app_update_url.toLowerCase().includes('.apk'))
    ? storeSettings.app_update_url
    : directApkUrl;
  const buttonText = storeSettings?.app_download_btn_text || 'Download APK';
  const appIconUrl = storeSettings?.app_icon || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 antialiased font-sans relative overflow-hidden select-none">
      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Centered Container */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-7 animate-in fade-in zoom-in duration-300">
        {/* 1. App Icon */}
        <div className="relative group">
          {loading ? (
            <div className="size-28 sm:size-32 rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
          ) : appIconUrl ? (
            <img
              src={appIconUrl}
              alt={appName}
              className="size-28 sm:size-32 rounded-3xl object-cover shadow-2xl shadow-emerald-500/20 ring-1 ring-emerald-400/20 transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="size-28 sm:size-32 rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/25 ring-1 ring-emerald-400/20 transition-transform duration-300 group-hover:scale-105">
              <Package size={56} className="text-white drop-shadow-sm" />
            </div>
          )}
        </div>

        {/* 2. App Name */}
        {loading ? (
          <div className="h-8 w-44 bg-slate-900 rounded-xl animate-pulse" />
        ) : (
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
            {appName}
          </h1>
        )}

        {/* 3. Download Button */}
        {loading ? (
          <div className="h-14 w-full bg-slate-900 rounded-2xl animate-pulse" />
        ) : (
          <a
            href={downloadUrl}
            download
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all duration-200 cursor-pointer ring-1 ring-emerald-400/25"
          >
            <Download size={20} className="stroke-[2.5]" />
            <span>{buttonText}</span>
          </a>
        )}
      </div>
    </div>
  );
}



