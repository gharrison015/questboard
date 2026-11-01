/* One-time takeover from the old prototype service worker.
   The prototype's cache-first worker served index.html from its own cache, and the
   new app's worker waits for a prompt that the old page can never show. When the
   prototype cache is present, take over at once, delete that cache and reload the
   open windows so they load the real app. Normal updates keep the prompt flow. */
const isProtoCache = (k) => k.startsWith('questboard-proto')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      if (keys.some(isProtoCache)) return self.skipWaiting()
    }),
  )
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
