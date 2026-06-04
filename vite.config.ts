import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    // PWA / offline shell. The offline-first itinerary feature needs the
    // app shell (HTML/JS/CSS) to load with no network so React can boot
    // and read the saved itinerary out of IndexedDB. The service worker
    // precaches the shell and runtime-caches images; trip *data* is NOT
    // cached here (it's a GraphQL POST) — it lives in IndexedDB instead.
    VitePWA({
      // autoUpdate keeps the SW from pinning users to a stale build:
      // a new deploy is fetched in the background and activated on the
      // next load, so we never serve outdated assets long-term.
      registerType: 'autoUpdate',
      // SW off during `vite dev` — it fights HMR. Test offline behavior
      // with `npm run build && npm run preview`.
      devOptions: { enabled: false },
      includeAssets: ['favicon.ico', 'robots.txt', 'images/**/*'],
      manifest: {
        name: 'DaTryp — Plan your next trip',
        short_name: 'DaTryp',
        description:
          'Plan trips, save bucket-list places, and keep your itinerary available offline.',
        theme_color: '#3cb54b',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/images/logo-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/images/logoIconWhite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the built shell so navigations resolve offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // SPA: any uncached navigation falls back to the precached shell
        // (BrowserRouter then renders the right route client-side).
        navigateFallback: '/index.html',
        // GraphQL/API calls must never be served from the SW — they're
        // POSTs and the offline data path is IndexedDB, not the cache.
        navigateFallbackDenylist: [/^\/graphql/, /^\/api/],
        runtimeCaching: [
          {
            // Activity / hero images (CloudFront, Unsplash, Google, etc.).
            // CacheFirst so a downloaded trip's images render offline once
            // they've been fetched at least once ("best-effort" per MVP).
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'datryp-images',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheet + font files so the UI keeps its
            // typography offline instead of falling back to system fonts.
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'datryp-google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
  },
  // Pre-bundle CJS/UMD packages that the export utilities lazy-import.
  // Without this, Vite's on-demand optimizer sometimes serves a broken
  // module shape (e.g. `Workbook` ends up undefined inside the dynamic-
  // import payload) and the export silently fails because the click
  // handler swallows the rejection. Listing them here forces pre-
  // bundling at dev-server startup so the shapes stabilize.
  optimizeDeps: {
    include: ['exceljs', 'pdfmake/build/pdfmake', 'pdfmake/build/vfs_fonts'],
  },
});
