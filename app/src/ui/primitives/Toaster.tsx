import { useSyncExternalStore } from 'react'

interface Toast { id: number; text: string }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = (): void => listeners.forEach((l) => l())

function show(text: string, ms = 3000): void {
  const id = nextId++
  toasts = [...toasts, { id, text }]
  emit()
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, ms)
}

const api = { show }

/** Module-level queue, so any component can raise a toast without a provider. */
export function useToast(): { show(text: string, ms?: number): void } {
  return api
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => toasts,
  )
  return (
    <div className="qb-toaster" role="status" aria-live="polite">
      {list.map((t) => <div key={t.id} className="qb-toast">{t.text}</div>)}
    </div>
  )
}
