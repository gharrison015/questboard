import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/questboard/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      filename: 'sw.js',
      workbox: {
        cacheId: 'qb',
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/questboard/index.html',
        navigateFallbackDenylist: [/^\/questboard\/prototype\//],
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
      },
      manifest: {
        name: 'QuestBoard',
        short_name: 'QuestBoard',
        scope: '/questboard/',
        start_url: '/questboard/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fffaf3',
        theme_color: '#ff7a3d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
