import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Download, Smartphone, Briefcase, Truck } from 'lucide-react';
import api from './services/api';
import { openAppOrFallback } from './components/SmartAppBanner';

export default function DownloadPage() {
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const mainViewRef = useRef(null);

  // Auto-scroll to the main customer view on load, hiding the top section
  useLayoutEffect(() => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      // Backup timeout for mobile browsers that delay rendering
      setTimeout(() => {
        mainViewRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 50);
    }
  }, [loading]); // re-run when loading finishes to ensure correct height

  useEffect(() => {
    api.get('/store/settings/', { params: { t: Date.now() } })
      .then((res) => setStoreSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const appName = storeSettings?.app_name || storeSettings?.store_name || 'Narendra Kirana';
  const appIconUrl = storeSettings?.app_icon || null;
  const buttonText = storeSettings?.app_download_btn_text || 'Download APK';

  const rawUpdateUrl = (storeSettings?.app_update_url || '').trim();
  const isPlayStoreUrl = rawUpdateUrl.includes('play.google.com') || rawUpdateUrl.startsWith('market://');

  const customerApkUrl = (rawUpdateUrl && !isPlayStoreUrl)
    ? rawUpdateUrl
    : 'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana.apk';

  const ownerApkUrl = 'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana-owner.apk';
  const deliveryApkUrl = 'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/narendra-kirana-delivery.apk';

  return (
    <div className="bg-slate-950 text-slate-100 antialiased font-sans relative select-none">
      
      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col">
        
        {/* ================================================== */}
        {/* 1. HIDDEN EASTER EGG SECTION (ABOVE MAIN VIEW)    */}
        {/* ================================================== */}
        <div className="w-full flex flex-col space-y-4 pt-16 pb-32 px-4 sm:px-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-px bg-slate-800 flex-1" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Authorized Personnel</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* Owner App */}
          <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Briefcase size={20} className="text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-300 text-sm">Store Owner App</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">CONFIDENTIAL</span>
              </div>
            </div>
            <a
              href={ownerApkUrl}
              download="narendra-kirana-owner.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors active:scale-90"
            >
              <Download size={16} />
            </a>
          </div>

          {/* Delivery App */}
          <div className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Truck size={20} className="text-orange-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-300 text-sm">Delivery Partner</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">CONFIDENTIAL</span>
              </div>
            </div>
            <a
              href={deliveryApkUrl}
              download="narendra-kirana-delivery.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="size-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-orange-600 hover:text-white transition-colors active:scale-90"
            >
              <Download size={16} />
            </a>
          </div>
        </div>

        {/* ================================================== */}
        {/* 2. MAIN CUSTOMER VIEW (AUTO-SCROLLED TO TOP)      */}
        {/* ================================================== */}
        <div ref={mainViewRef} className="w-full min-h-screen flex flex-col items-center px-4 sm:px-6 pt-4 pb-20 animate-in fade-in zoom-in duration-300">
          
          <header className="w-full flex items-center gap-3 z-20 mb-12 mt-2">
            <img src="/logo-transparent.png" alt="Logo" className="size-10 sm:size-12 object-contain drop-shadow-md" />
            <span className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">{appName}</span>
          </header>

          <div className="w-full flex flex-col items-center text-center space-y-7 bg-slate-900/40 p-8 rounded-[2rem] border border-emerald-500/20 shadow-2xl shadow-emerald-900/20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-500/20">
              <span>Customer App</span>
            </div>

            <div className="relative group">
              {loading ? (
                <div className="size-28 sm:size-32 rounded-3xl bg-slate-800 animate-pulse" />
              ) : (
                <img
                  src={appIconUrl || "/logo.jpg"}
                  alt={appName}
                  className="size-28 sm:size-32 rounded-3xl object-cover shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-400/30 transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>

            {loading ? (
              <div className="h-8 w-44 bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <h1 className="text-3xl font-black text-white tracking-tight leading-snug">
                {appName}
              </h1>
            )}

            {loading ? (
              <div className="h-14 w-full bg-slate-800 rounded-2xl animate-pulse" />
            ) : (
              <div className="w-full space-y-3">
                <a
                  href={customerApkUrl}
                  download="narendra-kirana.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all duration-200 cursor-pointer ring-1 ring-emerald-400/25"
                >
                  <Download size={20} className="stroke-[2.5]" />
                  <span>{buttonText}</span>
                </a>

                <button
                  type="button"
                  onClick={() => openAppOrFallback('')}
                  className="w-full py-3 px-6 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 border border-slate-800 transition-all cursor-pointer"
                >
                  <Smartphone size={18} />
                  <span>Already installed? Open App</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
