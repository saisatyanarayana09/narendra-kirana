import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Narendra Kirana Store',
        short_name: 'Narendra Kirana',
        description: 'Smart Kirana Store App',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/reset-password/,
          /^\/owner\/reset-password/,
          /^\/forgot-password/,
          /^\/verify-email/,
        ],
        // Cache API responses and assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/narendra-kirana\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (!normalized.includes('node_modules')) return;

          if (
            normalized.includes('/node_modules/react/') ||
            normalized.includes('/node_modules/react-dom/') ||
            normalized.includes('/node_modules/scheduler/') ||
            normalized.includes('/node_modules/react-router/') ||
            normalized.includes('/node_modules/react-router-dom/') ||
            normalized.includes('/node_modules/@remix-run/router/')
          ) {
            return 'vendor-react';
          }
          if (normalized.includes('/node_modules/recharts/') || normalized.includes('/node_modules/d3-')) {
            return 'vendor-charts';
          }
          if (normalized.includes('/node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          if (normalized.includes('/node_modules/axios/')) {
            return 'vendor-http';
          }
          if (normalized.includes('/node_modules/gsap/') || normalized.includes('/node_modules/@gsap/')) {
            return 'vendor-gsap';
          }
          if (normalized.includes('/node_modules/framer-motion/')) {
            return 'vendor-framer';
          }
          if (
            normalized.includes('/node_modules/html5-qrcode/') ||
            normalized.includes('/node_modules/@zxing/')
          ) {
            return 'vendor-scanner';
          }
          if (
            normalized.includes('/node_modules/jsqr/') ||
            normalized.includes('/node_modules/qrcode.react/')
          ) {
            return 'vendor-qrcode';
          }
          if (normalized.includes('/node_modules/@hello-pangea/')) {
            return 'vendor-dnd';
          }
          if (
            normalized.includes('/node_modules/browser-image-compression/') ||
            normalized.includes('/node_modules/react-image-crop/')
          ) {
            return 'vendor-image';
          }
          if (normalized.includes('/node_modules/react-hot-toast/')) {
            return 'vendor-ui';
          }
        },
      },
    },
    target: 'es2020',
    cssMinify: true,
  },
})
