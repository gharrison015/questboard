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
  build: {
    rollupOptions: {
      input: { main: 'index.html', devlab: 'devlab/index.html' },
    },
  },
  plugins: [
    react(),
    {
      // The dev server opens on the Device Lab, so a preview pane pointed at the port lands there.
      name: 'qb-devlab-home',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const [path, query = ''] = (req.url ?? '').split('?')
          if (path === '/' || path === '/questboard' || path === '/questboard/devlab') {
            res.statusCode = 302
            res.setHeader('Location', `/questboard/devlab/${query ? `?${query}` : ''}`)
            res.end()
            return
          }
          next()
        })
      },
    },
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
        navigateFallbackDenylist: [/^\/questboard\/prototype\//, /^\/questboard\/devlab\//],
        globPatterns: ['**/*.{js,css,html,png,woff2}'],
        // The Device Lab is a developer page; family devices never need it offline.
        globIgnores: ['devlab/**', 'assets/devlab-*'],
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
