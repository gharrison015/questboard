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

// A new version waits until the board is idle; see useApplyUpdateWhenIdle in the shell.
const updateSW = registerSW({ immediate: true, onNeedRefresh: () => markUpdateReady(updateSW) })

keepPagePinned()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider adapter={new LocalAdapter()}>
      <App />
    </StoreProvider>
  </StrictMode>,
)
