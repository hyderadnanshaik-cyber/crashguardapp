import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'dist/sw.js',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
      },
      manifest: {
        name: 'Crash Guard by RedHack',
        short_name: 'CrashGuard',
        description: 'Real-time motorcycle crash detection & emergency dispatch by RedHack',
        theme_color: '#dc2626',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: { '@': '/src' },
    // Prevent multiple React copies from being bundled (causes "Invalid hook call")
    dedupe: ['react', 'react-dom'],
  },

  build: {
    // Raise the warning threshold — anything above this still gets flagged
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *
         * vendor-react      – React core runtime (tiny, almost never changes)
         * vendor-firebase   – Firebase SDK (large but cached long-term)
         * vendor-maps       – Leaflet + react-leaflet (only loaded on map routes)
         * vendor-charts     – Recharts (only loaded in telemetry panel)
         * vendor-ui         – Lucide icons + framer-motion (shared UI)
         * Pages are split automatically by React.lazy() dynamic imports.
         */
        manualChunks(id) {
          // ── React core ──────────────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // ── Firebase ────────────────────────────────────────────────────
          if (id.includes('node_modules/firebase/') ||
              id.includes('node_modules/@firebase/')) {
            return 'vendor-firebase';
          }

          // ── Maps (Leaflet) ──────────────────────────────────────────────
          if (id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps';
          }

          // ── Charts (Recharts) ───────────────────────────────────────────
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-')) {
            return 'vendor-charts';
          }

          // ── UI utilities ────────────────────────────────────────────────
          if (id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/class-variance-authority')) {
            return 'vendor-ui';
          }

          // Everything else stays in its own auto-generated chunk
        },
      },
    },
  },
})
