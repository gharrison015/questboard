/**
 * Makes sure an open page does not stay on an old build. The page compares its own build id with
 * the live version.json (never cached). When they differ it asks the service worker to fetch the
 * update and tells a waiting worker to take over now. main.tsx then reloads the page into the new
 * version at an idle moment (see useApplyUpdateWhenIdle).
 */
const BUILD: string = import.meta.env.VITE_APP_VERSION ?? 'dev'

function skipWaiting(reg: ServiceWorkerRegistration): void {
  reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
}

export async function checkFreshness(): Promise<void> {
  if (BUILD === 'dev' || !('serviceWorker' in navigator)) return
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' })
    if (!res.ok) return
    const live = ((await res.json()) as { build?: string }).build
    if (!live || live === BUILD) return
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    reg.addEventListener('updatefound', () => {
      const w = reg.installing
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed') skipWaiting(reg)
      })
    })
    skipWaiting(reg)
    await reg.update()
    skipWaiting(reg)
  } catch {
    // Offline or the file is missing: try again next time the app comes to the front.
  }
}

export function watchFreshness(): void {
  void checkFreshness()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkFreshness()
  })
}
