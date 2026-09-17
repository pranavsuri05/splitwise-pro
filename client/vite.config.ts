import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Splitwise Pro',
        short_name: 'Splitwise Pro',
        description: 'A private, simple expense-sharing ledger for a small group of friends.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f7f8',
        theme_color: '#f7f7f8',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Precache only the built app shell (HTML/CSS/JS/icons). No
        // runtime caching rules are added for /api/*, so every API call
        // always goes straight to the network — financial data is never
        // served from the cache (Security_Specification.md §31,
        // System_Architecture.md §23).
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
})
