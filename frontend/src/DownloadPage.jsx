import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Download, Briefcase, Truck } from 'lucide-react';
import api from './services/api';


export default function DownloadPage() {
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const mainViewRef = useRef(null);

  useLayoutEffect(() => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
      setTimeout(() => {
        mainViewRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 50);
    }
  }, [loading]);

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
    <div className="bg-[#09090b] text-zinc-100 antialiased font-sans relative select-none">
      
      {/* Fixed App Bar */}
      <header className="fixed top-0 left-0 w-full flex items-center justify-center gap-3 py-4 z-50 bg-[#09090b]/80 backdrop-blur-lg border-b border-white/5">
        <img src="/logo-transparent.png" alt="Logo" className="size-8 object-contain" />
        <span className="font-bold text-lg text-zinc-100">{appName}</span>
      </header>
      
      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col">
        
        {/* ================================================== */}
        {/* 1. HIDDEN EASTER EGG SECTION (ABOVE MAIN VIEW)    */}
        {/* ================================================== */}
        <div className="w-full flex flex-col space-y-3 pt-24 pb-32 px-6 opacity-80">
          <a
            href={ownerApkUrl}
            download="narendra-kirana-owner.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Briefcase size={20} className="text-zinc-400" />
              <span className="font-semibold text-zinc-200 text-sm">Store Owner</span>
            </div>
            <Download size={18} className="text-zinc-500" />
          </a>

          <a
            href={deliveryApkUrl}
            download="narendra-kirana-delivery.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-zinc-400" />
              <span className="font-semibold text-zinc-200 text-sm">Delivery Partner</span>
            </div>
            <Download size={18} className="text-zinc-500" />
          </a>
        </div>

        {/* ================================================== */}
        {/* 2. MAIN CUSTOMER VIEW (AUTO-SCROLLED TO TOP)      */}
        {/* ================================================== */}
        <div ref={mainViewRef} className="w-full min-h-screen flex flex-col items-center px-6 pt-12 pb-20 animate-in fade-in duration-500 scroll-mt-16">
          


          <div className="w-full flex flex-col items-center text-center space-y-8">
            <div className="relative">
              {loading ? (
                <div className="size-32 rounded-3xl bg-zinc-900 animate-pulse" />
              ) : (
                <img
                  src={appIconUrl || "/logo.jpg"}
                  alt={appName}
                  className="size-32 rounded-3xl object-cover shadow-2xl"
                />
              )}
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="h-8 w-40 bg-zinc-900 rounded-lg animate-pulse mx-auto" />
              ) : (
                <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
                  {appName}
                </h1>
              )}
            </div>

            <div className="w-full space-y-3 pt-6">
              {loading ? (
                <div className="h-14 w-full bg-zinc-900 rounded-xl animate-pulse" />
              ) : (
                <>
                  <a
                    href={customerApkUrl}
                    download="narendra-kirana.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-6 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-base flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download size={20} strokeWidth={2.5} />
                    <span>{buttonText}</span>
                  </a>

                  <button
                    type="button"
                    disabled
                    className="w-full py-4 px-6 rounded-xl bg-zinc-900/40 text-zinc-500 font-medium text-sm flex items-center justify-center gap-2.5 cursor-not-allowed border border-zinc-800/40"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Play Store (Coming Soon)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
