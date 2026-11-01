import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { sessionValid } from '../../security/session'
import { useActions, useStore } from '../../state/store'
import { ParentGate, type GateMode } from './ParentGate'

interface ParentApi {
  unlocked: boolean
  /** Runs fn now when the parent session is valid, else opens the PIN gate and runs fn on success. */
  require(fn: () => void): void
  /** Asks for the PIN as a one-off grown-up check and runs fn on success. Never starts a parent session (Ruling 25). */
  confirm(fn: () => void): void
  lock(): void
  /** True when the PIN session is valid right now. Reads live, so a stale closure cannot outlive a lock. */
  isValid(): boolean
}

const ParentCtx = createContext<ParentApi | null>(null)

/** Renders the gate once at the shell level so any component can call `require`. */
export function ParentProvider({ children }: { children: ReactNode }) {
  const { parentUnlockedAt, now } = useStore()
  const { lockParent } = useActions()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<GateMode>('session')
  const pending = useRef<(() => void) | null>(null)
  const unlockedAtRef = useRef(parentUnlockedAt)
  unlockedAtRef.current = parentUnlockedAt

  const require = useCallback((fn: () => void): void => {
    if (sessionValid(unlockedAtRef.current, Date.now())) { fn(); return }
    pending.current = fn
    setMode('session')
    setOpen(true)
  }, [])

  const confirm = useCallback((fn: () => void): void => {
    pending.current = fn
    setMode('confirm')
    setOpen(true)
  }, [])

  const isValid = useCallback((): boolean => sessionValid(unlockedAtRef.current, Date.now()), [])

  const api = useMemo<ParentApi>(
    () => ({ unlocked: sessionValid(parentUnlockedAt, now.getTime()), require, confirm, lock: lockParent, isValid }),
    [parentUnlockedAt, now, require, confirm, lockParent, isValid],
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
      <ParentGate open={open} mode={mode} onClose={close} onSuccess={success} />
    </ParentCtx.Provider>
  )
}

export function useParent(): ParentApi {
  const v = useContext(ParentCtx)
  if (!v) throw new Error('useParent needs a ParentProvider')
  return v
}
