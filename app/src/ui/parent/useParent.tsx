import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { sessionValid } from '../../security/session'
import { useActions, useStore } from '../../state/store'
import { ParentGate } from './ParentGate'

interface ParentApi {
  unlocked: boolean
  /** Runs fn now when the parent session is valid, else opens the PIN gate and runs fn on success. */
  require(fn: () => void): void
  lock(): void
}

const ParentCtx = createContext<ParentApi | null>(null)

/** Renders the gate once at the shell level so any component can call `require`. */
export function ParentProvider({ children }: { children: ReactNode }) {
  const { parentUnlockedAt, now } = useStore()
  const { lockParent } = useActions()
  const [open, setOpen] = useState(false)
  const pending = useRef<(() => void) | null>(null)
  const unlockedAtRef = useRef(parentUnlockedAt)
  unlockedAtRef.current = parentUnlockedAt

  const require = useCallback((fn: () => void): void => {
    if (sessionValid(unlockedAtRef.current, Date.now())) { fn(); return }
    pending.current = fn
    setOpen(true)
  }, [])

  const api = useMemo<ParentApi>(
    () => ({ unlocked: sessionValid(parentUnlockedAt, now.getTime()), require, lock: lockParent }),
    [parentUnlockedAt, now, require, lockParent],
  )

  const close = (): void => { pending.current = null; setOpen(false) }
  const success = (): void => {
    const fn = pending.current
    pending.current = null
    setOpen(false)
    fn?.()
  }

  return (
    <ParentCtx.Provider value={api}>
      {children}
      <ParentGate open={open} onClose={close} onSuccess={success} />
    </ParentCtx.Provider>
  )
}

export function useParent(): ParentApi {
  const v = useContext(ParentCtx)
  if (!v) throw new Error('useParent needs a ParentProvider')
  return v
}
