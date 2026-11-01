import { useSyncExternalStore } from 'react'

interface ToastAction { label: string; onClick(): void }
interface Toast { id: number; text: string; action?: ToastAction }

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = (): void => listeners.forEach((l) => l())

function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function show(text: string, ms = 3000, action?: ToastAction): void {
  const id = nextId++
  toasts = [...toasts, { id, text, action }]
  emit()
  window.setTimeout(() => dismiss(id), ms)
}

const api = { show, dismiss }

/** Module-level queue, so any component can raise a toast without a provider. */
export function useToast(): { show(text: string, ms?: number, action?: ToastAction): void; dismiss(id: number): void } {
  return api
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => toasts,
  )
  return (
    <div className="qb-toaster" role="status" aria-live="polite">
      {list.map((t) => <div key={t.id} className="qb-toast">
          <span>{t.text}</span>
          {t.action ? (
            <button type="button" className="qb-toast-action" onClick={() => { t.action?.onClick(); dismiss(t.id) }}>
              {t.action.label}
            </button>
          ) : null}
        </div>)}
    </div>
  )
}
