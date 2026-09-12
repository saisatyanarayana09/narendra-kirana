# 📱 Narendra Kirana Mobile App — Product & Tech Overview

An executive and technical overview of the **Narendra Kirana** mobile commerce application, detailing customer-facing capabilities, native Android innovations, full-stack architecture, and performance engineering benchmarks.

---

## 🌟 Executive Summary

> **Narendra Kirana** is a high-performance, hyper-local grocery and kirana commerce application tailored specifically for the Indian retail ecosystem. Built with **React Native (Expo SDK 57)** on top of the **Hermes JavaScript Engine** and powered by a cloud-native **Django 5.x / PostgreSQL** backend, the app combines sub-second perceived latency, vernacular voice search, multi-modal Indian payment workflows (UPI intent, dynamic QR, COD), and a self-contained 1-tap in-app APK updater operating independently of third-party app stores.

---

## 1. ✨ Core Customer Features

### 🛒 Instant Catalog & Smart Shopping
* **0ms Perceived Transition**: Instant page transitions where product cards hand off their thumbnail, title, and cached price directly to the details page with zero blank loading screens.
* **Dynamic Home Feeds**: Configurable hero banners, festive announcement bars, deal carousels, and category grids controlled directly from the store owner portal.
* **Favorites & Quick Reorder**: 1-tap bookmarking for recurring monthly staples and daily groceries.
* **Stock Badging**: Real-time out-of-stock overlays and low-inventory alerts.

### 🎙️ Vernacular Voice & Multi-Modal Search
* **Native Android Speech Recognition**: Seamless **Telugu, Hindi, and English** voice search via Android's native `SpeechRecognizer` intent without cloud audio latency.
* **Live Search & Filter**: Real-time debounced search across hundreds of grocery SKUs with instant category and price filtering.
* **Weight Unit Multi-Packs**: Full support for loose and packaged products with custom units (`kg`, `g`, `litre`, `ml`, `pack`, `pc`).

### 🛍️ Smart Cart & Delivery Slot Booking
* **Hybrid Cart Synchronization**: Fully functional guest cart that seamlessly merges into the user's account upon login with zero item drops.
* **Scheduled Time Slots**: Customers select precise delivery/pickup windows (*"Today Evening"*, *"Tomorrow Morning"*) with automated past-slot cutoffs.
* **Minimum Order Thresholds & Dynamic Delivery**: Live progress bar showing how much more to add for free delivery.
* **Store Wallet Integration**: Deducts store reward coins and balance automatically at checkout up to configurable percentage caps.

### 💳 Frictionless Indian Payment Engine
* **UPI Intent (Deep-Linking)**: 1-tap launch of installed UPI payment apps (**Google Pay, PhonePe, Paytm, BHIM, Cred**) without manually entering VPA addresses.
* **Dynamic QR Code Fallback**: Real-time generated UPI QR code for cross-device desktop/phone scanning.
* **Manual UTR / Reference Verification**: Instant verification of UPI transaction IDs for complete store auditability.
* **Cash on Delivery (COD)**: Reliable fallback option for customers preferring cash transactions.

### 📦 Order Lifecycle & Digital Billing
* **Live Order Tracking**: Visual 5-stage progression (*Placed ➔ Confirmed ➔ Packed ➔ Out for Delivery ➔ Delivered*).
* **GST-Ready Digital Invoices**: 1-tap print, share, or download of formatted PDF invoices with official store signature.
* **Instant WhatsApp Support**: Direct 1-tap chat with store support pre-filling order ID and issue context.

### 🌐 Personalization & Native UI Experience
* **True Dark & Light Modes**: System-matched high-contrast themes optimized for OLED screens.
* **Multi-Language Localization**: Instant runtime switching between **English, Telugu (తెలుగు), and Hindi (हिन्दी)**.
* **Tactile Haptic Feedback**: Native vibration clicks on adding items to cart, adjusting quantities, and completing orders.
* **Refer & Earn Program**: Unique referral links and milestone wallets for viral customer acquisition.

---

## 2. ⚡ Native Engineering Innovations

### 🔄 1-Tap In-App APK Updater (Zero App Store Lock-in)
* **Direct Over-The-Air APK Updates**: The app checks the backend for newer builds on launch.
* **Live Progress Streaming**: Displays real-time download speed and progress (`X MB / Y MB - Z%`).
* **Auto Package Installer**: Invokes Android's native `IntentLauncher` to trigger installation right inside the app, removing dependency on Google Play approval delays.

### 📶 Offline-First & Network Fault Resilience
* **Multi-Tier Storage Architecture**: Synchronous in-memory L1 cache backed by asynchronous L2 `AsyncStorage` and hardware-backed `Expo SecureStore`.
* **Zero Startup Block**: Even during Render backend cold starts or slow 3G networks, the app renders cached categories and home banners instantly without blank lockouts.

---

## 3. 🛠️ Complete Technology Stack

| Layer | Technology | Details / Purpose |
| :--- | :--- | :--- |
| **Mobile Client** | **React Native (0.86)** | Cross-platform native architecture |
| **Framework** | **Expo SDK (v57)** | Native modules, intents, and build toolchain |
| **Language** | **TypeScript (5.9)** | Strict type safety across all components |
| **JS Engine** | **Hermes Engine** | Ahead-of-Time bytecode precompilation |
| **Navigation** | **React Navigation v7** | Native stack and tab navigators with `freezeOnBlur` |
| **Bundler** | **Metro Bundler** | Production minification with `inlineRequires` |
| **Backend API** | **Python 3.11 / Django 5.x** | High-concurrency RESTful API service |
| **API Framework** | **Django Rest Framework (DRF)** | Serialization, permissions, and JWT auth |
| **Database** | **PostgreSQL (Neon DB)** | Serverless cloud database with connection pooling |
| **Media & CDN** | **Cloudinary** | Dynamic responsive image transforms (`w_320,h_320,q_auto,f_auto`) |
| **Web Frontend** | **React 18 + Vite** | Customer web store and Owner Admin Portal (Vercel) |
| **Styling** | **Tailwind CSS** | Clean utility-first design system |
| **CI / CD Pipeline** | **GitHub Actions** | Automated native Gradle builds, keystore signing, and GitHub Releases |

---

## 4. 🚀 Performance Engineering Highlights

```
┌─────────────────────────────────────────────────────────────┐
│                 Performance Optimizations                   │
├──────────────────────┬─────────────────┬────────────────────┤
│ Metric               │ Before          │ Optimized (v1.3.3) │
├──────────────────────┼─────────────────┼────────────────────┤
│ Cold Startup Delay   │ 3,200 ms        │ < 700 ms (~78% ⬇)  │
│ Initial JS Memory    │ ~62 MB          │ ~26 MB (~58% ⬇)    │
│ Product Screen Latency│ 450 ms wait    │ 0 ms (Instant)     │
│ Image Payload Size   │ ~2.5 MB / tile  │ ~35 KB (~98% ⬇)    │
│ Checkout Key Lag     │ 45 ms / key     │ < 2 ms (Smooth)    │
│ APK Download Size    │ ~89 MB          │ ~42 MB (~52% ⬇)    │
└──────────────────────┴─────────────────┴────────────────────┘
```

1. **Hermes Bytecode Engine**: Precompiles JavaScript into compact bytecode ahead of time, eliminating runtime parsing delays on budget smartphone processors.
2. **Metro `inlineRequires: true`**: Modules and screens are lazily executed on demand rather than eagerly evaluated at boot, cutting cold launch memory by more than half.
3. **50% Smaller Download Size (~42MB)**: Stripped PC emulator architectures (`x86/x86_64`), building exclusively for real-world ARM hardware (`arm64-v8a` and `armeabi-v7a`).
4. **Dynamic CDN Thumbnails**: Product tiles fetch exact dimensions (`w_320,h_320,c_limit,q_auto,f_auto`), preventing full-resolution 4K asset downloads on grid views.
5. **Sub-2ms Checkout Typing**: Memoized time slot JSON calculations and order summaries ensure that keystrokes never trigger layout thrashing or frame drops.
