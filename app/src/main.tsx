import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/base.css'
import './styles/components.css'
import App from './App.tsx'
import { keepPagePinned } from './app/keepPagePinned.ts'
import { markUpdateReady } from './app/swUpdate.ts'
import { StoreProvider } from './state/store.tsx'
import { LocalAdapter } from './storage/local.ts'

// The worker activates a new version as soon as it installs (public/sw-migrate.js). The open
// page keeps running the code it loaded and reloads into the new version at an idle moment:
// the kid board with nothing open, or the first setup step before anything is typed.
const updateSW = registerSW({ immediate: true, onNeedRefresh: () => markUpdateReady(updateSW) })
if ('serviceWorker' in navigator) {
  // No controller yet means a first install; that takeover needs no reload.
  const hadController = navigator.serviceWorker.controller !== null
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) markUpdateReady(async () => window.location.reload())
  })
}

keepPagePinned()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider adapter={new LocalAdapter()}>
      <App />
    </StoreProvider>
  </StrictMode>,
)
