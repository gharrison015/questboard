import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/base.css'
import './styles/components.css'
import App from './App.tsx'
import { StoreProvider } from './state/store.tsx'
import { LocalAdapter } from './storage/local.ts'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider adapter={new LocalAdapter()}>
      <App />
    </StoreProvider>
  </StrictMode>,
)
