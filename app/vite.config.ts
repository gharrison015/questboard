import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Build id: commit plus build time. Shown in setup and Settings, written to version.json so an
// open page can tell it is stale, and used to cache-bust the worker add-on script.
function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'local'
  }
}
const BUILD = `${commit()}-${Date.now().toString(36)}`

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(BUILD) },
  base: '/questboard/',
  plugins: [
    react(),
    {
      name: 'qb-version-file',
      apply: 'build',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) })
      },
    },
    VitePWA({
      registerType: 'prompt',
      filename: 'sw.js',
      workbox: {
        cacheId: 'qb',
        // The query changes every build so a stale HTTP-cached copy (Pages sends max-age=600) is never reused.
        importScripts: [`sw-migrate.js?v=${BUILD}`],
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
