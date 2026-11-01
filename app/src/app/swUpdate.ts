import { useEffect, useSyncExternalStore } from 'react'

/**
 * A waiting service worker update. It is applied only while the app sits idle on the kid board
 * (no dialog open, no setup wizard, no parent view), so a reload never lands mid-tap.
 */
type Apply = (reloadPage?: boolean) => Promise<void>

let pending: Apply | null = null
const listeners = new Set<() => void>()
const emit = (): void => listeners.forEach((l) => l())

/** Called by registerSW's onNeedRefresh. */
export function markUpdateReady(apply: Apply): void {
  pending = apply
  emit()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const isReady = (): boolean => pending !== null

/** True when no dialog is open anywhere on the page. */
export function noDialogOpen(): boolean {
  return typeof document === 'undefined' || document.querySelector('[role="dialog"]') === null
}

/** Applies a waiting update when `idle` is true and nothing modal is open. `tick` re-checks on the clock. */
export function useApplyUpdateWhenIdle(idle: boolean, tick: unknown): void {
  const ready = useSyncExternalStore(subscribe, isReady, isReady)
  useEffect(() => {
    if (!ready || !idle || !noDialogOpen()) return
    const apply = pending
    pending = null
    void apply?.(true)
  }, [ready, idle, tick])
}
