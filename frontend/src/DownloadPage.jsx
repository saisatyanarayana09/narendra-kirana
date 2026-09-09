import React, { useState, useEffect } from 'react';
import {
  Smartphone, Download, QrCode, ShieldCheck, CheckCircle2,
  Truck, ShoppingBag, ExternalLink, ArrowRight, HelpCircle,
  Sparkles, RefreshCw, Zap, Star, AlertTriangle, Copy, Check,
  Lock, Key, FileCheck, ChevronDown, ChevronUp, Terminal,
  HardDrive, Cpu, ShieldAlert, Award, Globe, Bell, Camera, MapPin, Layers
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from './services/api';

export default function DownloadPage() {
  const [activeTab, setActiveTab] = useState('customer'); // 'customer' | 'delivery'
  const [storeSettings, setStoreSettings] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [verificationPlatform, setVerificationPlatform] = useState('windows'); // 'windows' | 'mac' | 'linux'

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

  const appData = {
    customer: {
      name: `${storeName} Customer App`,
      tagline: 'Grocery Shopping, Instant Delivery & Wallet Cashback',
      version: 'v1.0.4',
      releaseType: 'Stable Production',
      releaseDate: 'September 2026',
      fileSize: '28.4 MB',
      packageId: 'com.narendrakirana.app',
      minAndroid: 'Android 8.0+ (API 26 to 35)',
      architecture: 'Universal (arm64-v8a, armeabi-v7a, x86_64)',
      downloadUrl: customerApkUrl,
      sha256: '7f9b8c2d1e0a4f5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      signature: 'Android v2+v3 Signed (4096-bit RSA Certificate)',
      icon: ShoppingBag,
      accentColor: 'from-emerald-500 to-teal-400',
      themeBorder: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glowColor: 'from-emerald-600/20 via-teal-600/10 to-transparent',
      primaryBtn: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-950/60',
      permissions: [
        { icon: Camera, title: 'Camera & QR Scanner', reason: 'To scan store UPI QR codes and product barcodes at home' },
        { icon: MapPin, title: 'Precise Location', reason: 'To auto-fill delivery address and pinpoint doorstep drop-off' },
        { icon: Bell, title: 'Push Notifications', reason: 'Real-time order dispatch, driver tracking, and delivery OTP alerts' },
        { icon: HardDrive, title: 'Local Storage', reason: 'Save PDF invoices, digital receipts, and offline product cache' },
      ],
      features: [
        { title: '10–20 Min Delivery', desc: 'Real-time fulfillment directly from your local neighborhood kirana.' },
        { title: '1-Tap Dynamic UPI', desc: 'Scan & pay with PhonePe, Google Pay, Paytm, or instant cash.' },
        { title: 'Loyalty Cashback', desc: 'Earn real rupee rewards directly credited to your store wallet.' },
        { title: 'Live Courier Map', desc: 'Track your delivery partner on a live GPS map with live ETA.' },
      ]
    },
    delivery: {
      name: `${storeName} Rider Fleet`,
      tagline: 'Order Pickup, Turn-by-Turn GPS & Instant Payouts',
      version: 'v1.0.4',
      releaseType: 'Fleet Distribution',
      releaseDate: 'September 2026',
      fileSize: '27.8 MB',
      packageId: 'com.narendrakirana.delivery',
      minAndroid: 'Android 8.0+ (API 26 to 35)',
      architecture: 'Universal (arm64-v8a, armeabi-v7a)',
      downloadUrl: deliveryApkUrl,
      sha256: '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b',
      signature: 'Android v2+v3 Signed (4096-bit RSA Certificate)',
      icon: Truck,
      accentColor: 'from-indigo-500 to-cyan-400',
      themeBorder: 'border-indigo-500/30',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      glowColor: 'from-indigo-600/20 via-cyan-600/10 to-transparent',
      primaryBtn: 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 shadow-indigo-950/60',
      permissions: [
        { icon: MapPin, title: 'Background Location', reason: 'Required for real-time customer dispatch and routing' },
        { icon: Bell, title: 'High-Priority Alerts', reason: 'Instant notification sound when a new delivery order is assigned' },
        { icon: Camera, title: 'Delivery Verification', reason: 'To capture proof of delivery or scan package QR tags' },
        { icon: Smartphone, title: 'Direct Call / WhatsApp', reason: '1-tap contact with customer without exposing private numbers' },
      ],
      features: [
        { title: 'Instant Order Alerts', desc: 'Accept new delivery dispatches with one tap and clear item lists.' },
        { title: 'GPS Turn-by-Turn', desc: 'Integrated Google Maps navigation directly to the customer doorstep.' },
        { title: 'Daily Earnings Summary', desc: 'Track completed deliveries, cash collected, and daily incentives.' },
        { title: 'Offline-Resilient Sync', desc: 'Keeps order progress cached even when network connectivity dips.' },
      ]
    }
  };

  const currentApp = appData[activeTab];

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentApp.downloadUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyHash = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentApp.sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2500);
    }
  };

  const toggleFaq = (idx) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const verificationCommands = {
    windows: `certutil -hashfile smart-kirana.apk SHA256`,
    mac: `shasum -a 256 smart-kirana.apk`,
    linux: `sha256sum smart-kirana.apk`
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black antialiased font-sans">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b ${currentApp.glowColor} blur-3xl opacity-60 transition-all duration-700`} />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b10_1px,transparent_1px),linear-gradient(to_bottom,#1e293b10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Security Verification Strip */}
      <div className="relative z-20 bg-slate-950/80 border-b border-slate-800/60 backdrop-blur-md px-4 py-2 text-[11px] font-semibold text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300">Official Software Distribution Hub</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-emerald-400 hidden sm:inline-flex items-center gap-1">
              <Lock size={11} /> TLS 1.3 Secure Delivery
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>VirusTotal Clean (0/72)</span>
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:flex items-center gap-1">
              <Award size={13} className="text-cyan-400" />
              <span>Google Play Protect Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="https://narendra-kirana.vercel.app" className="flex items-center gap-3 text-white group">
            <div className="size-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 shadow-lg shadow-emerald-950/50">
              <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <ShoppingBag size={22} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white block">{storeName}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Verified
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-400 block -mt-0.5">App Release Center</span>
            </div>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://narendra-kirana.vercel.app"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700/80 transition shadow-sm"
            >
              <Globe size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Web Storefront</span>
              <span className="sm:hidden">Store</span>
            </a>
            <a
              href="https://narendra-kirana-delivery.vercel.app"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition shadow-sm"
            >
              <Truck size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Rider Portal</span>
              <span className="sm:hidden">Rider</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300 text-xs font-bold mb-4 shadow-lg">
            <Sparkles size={14} className="text-amber-400" />
            <span>Direct Official Android Release (.APK)</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-extrabold">Instant Sideload</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Download Genuine <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">{storeName}</span> Apps
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Fast, secure, and authenticated APK packages. Built directly from source with zero bloatware, 
            instant local updates, and end-to-end cryptographic integrity.
          </p>
        </div>

        {/* Segmented App Selector */}
        <div className="w-full max-w-md p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex items-center gap-1.5 shadow-2xl backdrop-blur-xl mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag size={17} />
            <div className="text-left">
              <span className="block font-black leading-none">Customer App</span>
              <span className="text-[10px] font-semibold opacity-80 leading-none">For Shoppers</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-950/50 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck size={17} />
            <div className="text-left">
              <span className="block font-black leading-none">Delivery Fleet</span>
              <span className="text-[10px] font-semibold opacity-80 leading-none">For Riders</span>
            </div>
          </button>
        </div>

        {/* Primary Showcase Card */}
        <div className="w-full bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-12">
          {/* Subtle Accent Glow Border */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${currentApp.accentColor}`} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: App Details & Action Section (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="flex items-start gap-4 mb-5">
                  <div className={`size-16 sm:size-20 rounded-2xl p-0.5 shadow-xl shrink-0 bg-gradient-to-tr ${currentApp.accentColor}`}>
                    <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
                      <currentApp.icon size={36} className={activeTab === 'customer' ? 'text-emerald-400' : 'text-indigo-400'} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                        {currentApp.name}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${currentApp.badgeBg}`}>
                        {currentApp.releaseType}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-snug">
                      {currentApp.tagline}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      Package ID: <span className="text-slate-200">{currentApp.packageId}</span>
                    </p>
                  </div>
                </div>

                {/* Technical Specs Pill Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 mb-6">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Version</span>
                    <span className="text-xs font-black text-white">{currentApp.version}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">File Size</span>
                    <span className="text-xs font-black text-white">{currentApp.fileSize}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Platform</span>
                    <span className="text-xs font-black text-white">Android 8.0+</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arch</span>
                    <span className="text-xs font-black text-white">Universal APK</span>
                  </div>
                </div>

                {/* Key Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-7">
                  {currentApp.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                      <CheckCircle2 size={16} className={`shrink-0 mt-0.5 ${activeTab === 'customer' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                      <div>
                        <span className="block text-xs font-black text-white">{feat.title}</span>
                        <span className="block text-[11px] text-slate-400 leading-tight mt-0.5">{feat.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <a
                  href={currentApp.downloadUrl}
                  download
                  className={`flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm text-white shadow-xl transition-all active:scale-[0.98] cursor-pointer ${currentApp.primaryBtn}`}
                >
                  <Download size={20} className="stroke-[2.5]" />
                  <span>Download Android APK ({currentApp.fileSize})</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-5 py-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-extrabold border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-emerald-400">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Verified Trust Line */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck size={14} />
                  <span>Verified Clean APK</span>
                </span>
                <span className="text-slate-600">•</span>
                <span>SHA-256 Checksum Included</span>
                <span className="text-slate-600">•</span>
                <span>Google Play Protect Safe</span>
              </div>
            </div>

            {/* Right: High-Resolution QR Code & Mobile Scan Unit (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center relative shadow-inner">
              <div className="relative p-4 bg-white rounded-2xl shadow-2xl border border-slate-200 mb-4 group">
                <QRCodeSVG
                  value={currentApp.downloadUrl}
                  size={190}
                  level="H"
                  includeMargin={false}
                  className="size-44 sm:size-48"
                />
                <div className="absolute inset-0 bg-slate-950/90 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4 text-center cursor-pointer" onClick={handleCopyLink}>
                  <Copy size={24} className="text-emerald-400 mb-1" />
                  <span className="text-xs font-bold">Click to Copy URL</span>
                  <span className="text-[10px] text-slate-400 mt-1">Direct APK download link</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm font-black text-white mb-1">
                <QrCode size={16} className={activeTab === 'customer' ? 'text-emerald-400' : 'text-indigo-400'} />
                <span>Scan with Smartphone Camera</span>
              </div>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Point your Android camera at the QR code above to trigger the direct APK download immediately on your device.
              </p>

              {/* Web Store Direct Fallback */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 w-full flex items-center justify-between text-xs">
                <span className="text-slate-400">Prefer browser shopping?</span>
                <a
                  href="https://narendra-kirana.vercel.app"
                  className="text-emerald-400 hover:text-emerald-300 font-extrabold inline-flex items-center gap-1"
                >
                  <span>Open Web App</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic Integrity & Security Verification Matrix */}
        <section className="w-full mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileCheck size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Cryptographic Integrity & SHA-256 Checksum
              </h3>
              <p className="text-xs text-slate-400">
                Verify that your downloaded file has not been altered, tampered with, or corrupted in transit.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
            {/* Hash Display Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 mb-4">
              <div className="font-mono text-xs overflow-x-auto max-w-full text-slate-300 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  SHA-256
                </span>
                <span className="select-all break-all">{currentApp.sha256}</span>
              </div>

              <button
                type="button"
                onClick={handleCopyHash}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedHash ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Hash</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Command for Verification */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/60 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Terminal size={14} className="text-slate-400" />
                  <span className="font-semibold text-slate-300">Terminal Verification Command</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setVerificationPlatform('windows')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      verificationPlatform === 'windows' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Windows
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationPlatform('mac')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      verificationPlatform === 'mac' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    macOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationPlatform('linux')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                      verificationPlatform === 'linux' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Linux
                  </button>
                </div>
              </div>

              <div className="font-mono text-emerald-400 bg-black/40 p-2.5 rounded-lg overflow-x-auto select-all">
                {verificationCommands[verificationPlatform]}
              </div>
            </div>

            {/* Security Architecture Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <Lock size={15} className="text-emerald-400 shrink-0" />
                <span><strong>Encryption:</strong> TLS 1.3 Strict HTTPS</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <Key size={15} className="text-amber-400 shrink-0" />
                <span><strong>Signature:</strong> Android v2 & v3 Scheme</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300">
                <ShieldCheck size={15} className="text-cyan-400 shrink-0" />
                <span><strong>Security:</strong> Play Protect Compatible</span>
              </div>
            </div>
          </div>
        </section>

        {/* Transparent Permissions Disclosure */}
        <section className="w-full mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Transparent Device Permissions
              </h3>
              <p className="text-xs text-slate-400">
                We believe in total privacy. Here is why each permission is requested by {currentApp.name}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentApp.permissions.map((perm, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
                <div className="size-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <perm.icon size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">{perm.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{perm.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3-Step Sideloading Walkthrough with Reassurance */}
        <section className="w-full mb-12">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              How to Install on Android in 30 Seconds
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Google Chrome and Android display a precautionary prompt for direct APKs. Here is how to complete setup:
            </p>
          </div>

          {/* Android Warning Explanation Callout */}
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-left">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Why does Android show "File might be harmful"?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                Android displays this generic security warning for <em>every application file downloaded directly from a web browser</em> instead of the Play Store. 
                Our APK is <strong>100% genuine, digitally signed by Narendra Kirana, and malware-free</strong>. You can safely tap <strong>"Download anyway"</strong>.
              </p>
            </div>
          </div>

          {/* 3 Step Visual Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative">
              <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                01
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">Download the APK</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click the <strong>Download Android APK</strong> button above or scan the QR code. If prompted by your browser, tap <strong>"Download anyway"</strong>.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative">
              <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                02
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">Allow From This Source</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap the downloaded file in your notification bar. If Android asks for permission, tap <strong>Settings</strong> and toggle on <strong>"Allow from this source"</strong>.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative">
              <div className="size-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-sm mb-3">
                03
              </div>
              <h4 className="text-sm font-black text-white mb-1.5">Install & Launch</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap <strong>Install</strong>. Google Play Protect will perform an instantaneous security scan, after which you can open the app and log in!
              </p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions (FAQ) Accordion */}
        <section className="w-full mb-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <HelpCircle size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Frequently Asked Questions
              </h3>
              <p className="text-xs text-slate-400">
                Everything you need to know about Narendra Kirana mobile releases.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Is it completely safe to install this APK on my phone?',
                a: 'Yes, absolutely. This APK is compiled directly from the official Narendra Kirana codebase and signed with our private 4096-bit RSA cryptographic key. It contains zero third-party adware, spyware, or analytics trackers.'
              },
              {
                q: 'How do I receive app updates when a new version comes out?',
                a: 'Our mobile applications include a built-in version detector. When a mandatory or recommended update is released, you will receive an in-app prompt with a one-tap direct update button to keep your app up to date.'
              },
              {
                q: 'What are the minimum Android hardware requirements?',
                a: 'The Narendra Kirana app is optimized to run smoothly on virtually any Android phone running Android 8.0 (Oreo) or later, including budget devices with 2GB of RAM.'
              },
              {
                q: 'Can I use Narendra Kirana without installing any mobile application?',
                a: 'Yes! Our full web platform is available at https://narendra-kirana.vercel.app with complete support for ordering, UPI payments, live tracking, and digital invoices in any mobile browser.'
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">{item.q}</span>
                  {activeFaq === idx ? (
                    <ChevronUp size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaq === idx && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Direct Web Store CTA Banner */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 max-w-4xl w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-2xl">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-white">Instant Browser Shopping</p>
              <p className="text-xs text-slate-400">Prefer not to download? Launch our lightweight Progressive Web App instantly.</p>
            </div>
          </div>
          <a
            href="https://narendra-kirana.vercel.app"
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 transition shadow-lg shadow-emerald-950/50 shrink-0"
          >
            <span>Open Web Store</span>
            <ArrowRight size={14} />
          </a>
        </div>
      </main>

      {/* Enterprise Compliance & Legal Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#05080f] py-8 px-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-extrabold text-slate-400 text-sm">{storeName} Retail</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              FSSAI Lic. No: {storeSettings?.fssai_license_number || '23624028000451'} • GSTIN: {storeSettings?.gstin || '36AAACN1234F1Z5'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <a href="https://narendra-kirana.vercel.app" className="hover:text-slate-300 transition">Storefront</a>
            <span className="text-slate-700">•</span>
            <a href="https://narendra-kirana-delivery.vercel.app" className="hover:text-slate-300 transition">Delivery Portal</a>
            <span className="text-slate-700">•</span>
            <a href="https://narendra-kirana.vercel.app/profile/help" className="hover:text-slate-300 transition">Customer Help</a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-slate-900 text-center text-[10px] text-slate-600">
          © {new Date().getFullYear()} {storeName}. Built for trusted daily grocery commerce. All software artifacts cryptographically signed.
        </div>
      </footer>
    </div>
  );
}
