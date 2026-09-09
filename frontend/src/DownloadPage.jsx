import React, { useState, useEffect } from 'react';
import {
  Download, ShieldCheck, Package,
  Zap, Bug, Star, ArrowRight,
  CheckCircle2, Lock, Info, Wifi
} from 'lucide-react';
import api from './services/api';

// NK App Icon
function AppIcon({ size = 80 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="relative shrink-0 rounded-[22%] bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-500/30 ring-1 ring-emerald-400/20"
    >
      <div className="absolute inset-0 rounded-[22%] bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
      <Package size={size * 0.48} className="text-white drop-shadow-sm" />
    </div>
  );
}

const CHANGELOG_ICONS = {
  feature: { icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'feature' },
  fix:     { icon: Bug,  color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',   label: 'fix' },
  perf:    { icon: Zap,  color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20', label: 'perf' },
};

const CHANGELOGS = [
  { type: 'feature', text: 'Real-time live driver delivery tracking with map ETA' },
  { type: 'feature', text: '1-tap Dynamic UPI QR payments (GPay, PhonePe, Paytm, Cash)' },
  { type: 'feature', text: 'Wallet cashback rewards and instant referral bonuses' },
  { type: 'perf',    text: 'Faster app startup time and smoother cart checkout flow' },
  { type: 'fix',     text: 'Minor bug fixes and stability enhancements' },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Official & Verified', desc: 'APK served directly from Narendra Kirana official servers. No third-party mirrors.' },
  { icon: Lock,        title: 'No Hidden Permissions', desc: 'App only requests location (for delivery tracking) and storage. Nothing else.' },
  { icon: Wifi,        title: 'Safe to Sideload', desc: 'Enable "Install from unknown sources" in Android Settings → Security to install.' },
];

const INSTALL_STEPS = [
  { n: '1', title: 'Download the APK', desc: 'Tap the download button above. The file saves to your Downloads folder.' },
  { n: '2', title: 'Allow Installation', desc: 'Go to Settings → Security → Enable "Install Unknown Apps" for your browser.' },
  { n: '3', title: 'Open & Install', desc: 'Tap the downloaded APK file and follow the on-screen installer prompts.' },
  { n: '4', title: 'Launch & Sign In', desc: 'Open Narendra Kirana, create an account or sign in, and start ordering!' },
];

function SkeletonPulse({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800 ${className}`} />;
}

export default function DownloadPage() {
  const [storeSettings, setStoreSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/store/settings/')
      .then((res) => setStoreSettings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const storeName   = storeSettings?.store_name || 'Narendra Kirana';
  const downloadUrl = storeSettings?.app_update_url ||
    'https://github.com/saisatyanarayana09/narendra-kirana/releases/latest/download/smart-kirana.apk';
  const version     = storeSettings?.latest_mobile_version || '1.0.4';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased font-sans">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-600/8 blur-[130px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-700/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppIcon size={36} />
            <div>
              <p className="text-sm font-black text-white leading-tight">{loading ? '—' : storeName}</p>
              <p className="text-[11px] text-slate-400">Official App Download</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>v{version} Live</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-start">

          {/* LEFT: Download CTA — sticky on desktop */}
          <div className="lg:col-span-2 lg:sticky lg:top-8 space-y-6">

            {/* App Identity */}
            <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-start gap-5">
              {loading
                ? <SkeletonPulse className="size-20 rounded-2xl shrink-0" />
                : <AppIcon size={80} />
              }
              <div className="space-y-1.5">
                {loading ? (
                  <>
                    <SkeletonPulse className="h-7 w-48 mb-1" />
                    <SkeletonPulse className="h-4 w-64 mb-2" />
                    <SkeletonPulse className="h-5 w-24 rounded-full" />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{storeName}</h1>
                    <p className="text-sm text-slate-400 leading-relaxed">Fresh groceries delivered to your doorstep.</p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 size={11} />
                        v{version}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Android 5.0+</span>
                      <span className="text-[11px] text-slate-500 font-medium">Free</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Download Button */}
            {loading
              ? <SkeletonPulse className="h-14 w-full rounded-2xl" />
              : (
                <a
                  href={downloadUrl}
                  download
                  className="group w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 transition-all duration-200 cursor-pointer ring-1 ring-emerald-400/20"
                >
                  <Download size={20} className="stroke-[2.5]" />
                  <span>Download APK</span>
                  <ArrowRight size={16} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </a>
              )
            }

            {/* Quick Specs */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Version', value: loading ? '—' : `v${version}` },
                { label: 'Platform', value: 'Android' },
                { label: 'Price', value: 'Free' },
              ].map((spec) => (
                <div key={spec.label} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{spec.label}</p>
                  <p className="text-xs font-black text-white">{spec.value}</p>
                </div>
              ))}
            </div>

            {/* Trust Signals */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                Security & Trust
              </h3>
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="size-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">{item.title}</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Changelog + Install Guide */}
          <div className="lg:col-span-3 space-y-10">

            {/* What's New */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-white">What's New</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{loading ? 'Loading...' : `Version ${version} release notes`}</p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400">Latest Release</span>
              </div>

              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-800/80" />

                {CHANGELOGS.map((item, idx) => {
                  const cfg = CHANGELOG_ICONS[item.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={idx} className="relative flex gap-4 pb-5 last:pb-0">
                      <div className={`relative shrink-0 size-7 rounded-full border flex items-center justify-center z-10 bg-slate-950 ${cfg.bg}`}>
                        <Icon size={13} className={cfg.color} />
                      </div>
                      <div className="flex-1 pt-0.5 pb-4 border-b border-slate-800/40 last:border-0">
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className={`shrink-0 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <p className="text-sm text-slate-200 leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-slate-800/60" />

            {/* Install Guide */}
            <section>
              <div className="mb-6">
                <h2 className="text-xl font-black text-white">How to Install</h2>
                <p className="text-xs text-slate-400 mt-0.5">Android APK sideload in 4 simple steps</p>
              </div>

              <div className="space-y-3">
                {INSTALL_STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors group">
                    <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      {step.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white">{step.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{step.desc}</p>
                    </div>
                    {idx === 0 && (
                      <a
                        href={downloadUrl}
                        download
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition active:scale-95"
                      >
                        <Download size={12} />
                        Get APK
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Info note */}
              <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
                <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  <strong className="text-amber-300">Why not Google Play?</strong>{' '}
                  This app is distributed directly by {storeName} for faster updates and zero platform fees. It is safe and verified.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 mt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {loading ? 'Narendra Kirana' : storeName}. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>Official APK — Safe to install</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


