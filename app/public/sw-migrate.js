/* Worker additions, loaded into the generated sw.js through workbox importScripts.

   1. A new version takes over as soon as it is installed. Waiting for every tab to close
      left phones on an old build for days (an in-app browser or a home screen app rarely
      closes all the way). The app is one script file, so an open page keeps working on the
      code it already loaded; main.tsx reloads it into the new version at an idle moment.

   2. One-time takeover from the June prototype's cache-first worker: delete its cache and
      reload the open windows, since the prototype page has no code to reload itself. */
const isProtoCache = (k) => k.startsWith('questboard-proto')

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const cleaned = (async () => {
    const proto = (await caches.keys()).filter(isProtoCache)
    if (proto.length === 0) return false
    await Promise.all(proto.map((k) => caches.delete(k)))
    await self.clients.claim()
    return true
  })()
  event.waitUntil(cleaned)
  // Reload outside waitUntil: a reload's fetch waits for activation to finish,
  // so awaiting it inside activation stalls both.
  cleaned.then(async (did) => {
    if (!did) return
    const windows = await self.clients.matchAll({ type: 'window' })
    windows.forEach((w) => w.navigate(w.url).catch(() => undefined))
  })
})
