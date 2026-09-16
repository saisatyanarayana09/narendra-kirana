import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Smartphone, X, ExternalLink } from 'lucide-react';

export function SmartAppBanner() {
  const [isMobileDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  });
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(sessionStorage.getItem('smart_kirana_app_banner_dismissed'));
    } catch {
      return false;
    }
  });
  const location = useLocation();

  if (!isMobileDevice || dismissed) {
    return null;
  }

  // Construct the smartkirana:// deep link URL corresponding to the current web route
  const currentPath = location.pathname.replace(/^\/+|\/+$/g, '');
  const search = location.search || '';
  const appSchemeUrl = currentPath
    ? `smartkirana://${currentPath}${search}`
    : `smartkirana://`;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('smart_kirana_app_banner_dismissed', 'true');
  };

  const handleOpenApp = () => {
    // Attempt to launch the mobile app via custom URI scheme with graceful fallback to /download
    const start = Date.now();
    window.location.href = appSchemeUrl;
    setTimeout(() => {
      if (Date.now() - start < 2000 && !document.hidden) {
        window.location.href = '/download';
      }
    }, 1500);
  };

  return (
    <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm sticky top-0 z-50">
      <div className="flex items-center gap-2.5 overflow-hidden">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Smartphone size={18} className="text-white" />
        </div>
        <div className="truncate">
          <p className="font-extrabold truncate">Narendra Kirana Mobile App</p>
          <p className="text-emerald-100 text-[11px] truncate">
            Faster checkout, live order tracking & instant invoices
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          onClick={handleOpenApp}
          className="px-3 py-1.5 bg-white text-emerald-800 font-extrabold rounded-lg shadow-sm hover:bg-emerald-50 active:scale-95 transition-all text-xs flex items-center gap-1"
        >
          Open App <ExternalLink size={12} />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-emerald-200 hover:text-white transition-colors"
          title="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default SmartAppBanner;
