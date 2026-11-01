import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef,
  type ReactNode,
} from 'react'
import { applyFamilyAction, type FamilyAction } from '../engine/reducer'
import { dueWeekCloses } from '../engine/closeWeeks'
import type { Family, Kid, QBEvent } from '../engine/types'
import { detectMode, type Mode } from '../app/mode'
import { resolveAppearance, type ResolvedAppearance } from '../app/appearance'
import { useViewport } from '../app/useViewport'
import { verifyPin } from '../security/pin'
import { sessionValid, tryUnlock, type LockoutState } from '../security/session'
import { DEFAULT_DEVICE, EMPTY_LOCKOUT, type DeviceSettings, type StorageAdapter } from '../storage/adapter'
import { storeReducer, type StoreState, type View } from './storeState'

export interface StoreValue {
  family: Family | null
  events: QBEvent[]
  device: DeviceSettings
  lockout: LockoutState
  currentKidId: string | null
  parentUnlockedAt: number | null
  view: View
  mode: Mode
  appearance: ResolvedAppearance
  now: Date
}

export interface Actions {
  append(events: QBEvent[]): Promise<void>
  /** Every action runs through one queue, so overlapping calls apply in order. Unmatched ids in a family action (unknown kid, chore, routine) are no-ops. Limit breaches throw LimitError. */
  update(action: FamilyAction): Promise<void>
  setKid(id: string): void
  /** Opens the parent view. A no-op unless the parent session is valid. Only the gate success path calls it. */
  enterParent(): void
  setDevice(patch: Partial<DeviceSettings>): Promise<void>
  unlockParent(pin: string): Promise<'ok' | 'bad' | 'locked'>
  lockParent(): void
  replaceAll(family: Family, events: QBEvent[]): Promise<void>
}

const StoreCtx = createContext<StoreValue | null>(null)
const ActionsCtx = createContext<Actions | null>(null)

const TICK_MS = 60_000

export function activeKids(family: Family | null): Kid[] {
  return (family?.kids ?? []).filter((k) => !k.archived).sort((a, b) => a.order - b.order)
}

export function StoreProvider({ adapter, children }: { adapter: StorageAdapter; children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, undefined, (): StoreState => ({
    loaded: false, family: null, events: [], device: DEFAULT_DEVICE, lockout: EMPTY_LOCKOUT,
    currentKidId: null, parentUnlockedAt: null, view: 'kid', now: new Date(),
  }))
  // The ref is the source of truth for actions, so two calls in one tick see each other's results.
  const ref = useRef(state)
  const commit = useCallback((patch: Partial<StoreState>): void => {
    ref.current = { ...ref.current, ...patch }
    dispatch(patch)
  }, [])
  const viewport = useViewport()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await adapter.load()
      if (cancelled) return
      const closes = loaded.family ? dueWeekCloses(loaded.family, loaded.events, new Date()) : []
      if (closes.length > 0) await adapter.appendEvents(closes)
      if (cancelled) return
      commit({
        loaded: true, family: loaded.family, events: [...loaded.events, ...closes],
        device: loaded.device, lockout: loaded.lockout, now: new Date(),
      })
    })()
    return () => { cancelled = true }
  }, [adapter, commit])

  useEffect(() => {
    const id = window.setInterval(() => commit({ now: new Date() }), TICK_MS)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') commit({ now: new Date() })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [commit])

  const actions = useMemo<Actions>(() => {
    // One promise chain: each action starts after the previous one finished, success or failure.
    let chain: Promise<unknown> = Promise.resolve()
    const enqueue = <T,>(fn: () => Promise<T>): Promise<T> => {
      const run = chain.then(fn)
      chain = run.then(() => undefined, () => undefined)
      return run
    }
    return {
      append: (events) => enqueue(async () => {
        if (events.length === 0) return
        await adapter.appendEvents(events)
        commit({ events: [...ref.current.events, ...events] })
      }),
      update: (action) => enqueue(async () => {
        const family = ref.current.family
        if (!family) return
        const next = applyFamilyAction(family, action)
        await adapter.saveFamily(next)
        commit({ family: next })
      }),
      setKid: (id) => commit({ currentKidId: id }),
      enterParent: () => {
        if (sessionValid(ref.current.parentUnlockedAt, Date.now())) commit({ view: 'parent' })
      },
      setDevice: (patch) => enqueue(async () => {
        const next = { ...ref.current.device, ...patch }
        await adapter.saveDevice(next)
        commit({ device: next })
      }),
      unlockParent: (pin) => enqueue(async () => {
        const { family } = ref.current
        if (!family) return 'bad' as const
        const at = Date.now()
        const pinOk = await verifyPin(pin, family.pinSalt, family.pinHash)
        const { state: next, result } = tryUnlock(pinOk, ref.current.lockout, at)
        await adapter.saveLockout(next)
        commit({ lockout: next, ...(result === 'ok' ? { parentUnlockedAt: at } : {}) })
        return result
      }),
      lockParent: () => commit({ parentUnlockedAt: null, view: 'kid' }),
      replaceAll: (family, events) => enqueue(async () => {
        const { device, lockout } = ref.current
        const closes = dueWeekCloses(family, events, new Date())
        const all = [...events, ...closes]
        await adapter.wipe()
        await adapter.saveFamily(family)
        await adapter.appendEvents(all)
        await adapter.saveDevice(device)
        await adapter.saveLockout(lockout)
        commit({ family, events: all, currentKidId: null, view: 'kid' })
      }),
    }
  }, [adapter, commit])

  const value = useMemo<StoreValue>(() => {
    const mode = detectMode({ ...viewport, override: state.device.modeOverride })
    const appearance = resolveAppearance(
      state.family?.appearance ?? 'auto', state.device.appearanceOverride, mode, state.now,
    )
    return {
      family: state.family, events: state.events, device: state.device, lockout: state.lockout,
      currentKidId: state.currentKidId, parentUnlockedAt: state.parentUnlockedAt, view: state.view,
      mode, appearance, now: state.now,
    }
  }, [state, viewport])

  if (!state.loaded) return null
  return (
    <ActionsCtx.Provider value={actions}>
      <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
    </ActionsCtx.Provider>
  )
}

export function useStore(): StoreValue {
  const v = useContext(StoreCtx)
  if (!v) throw new Error('useStore needs a StoreProvider')
  return v
}

export function useActions(): Actions {
  const v = useContext(ActionsCtx)
  if (!v) throw new Error('useActions needs a StoreProvider')
  return v
}

/** Active kids in display order. */
export function useKids(): Kid[] {
  const { family } = useStore()
  return useMemo(() => activeKids(family), [family])
}

/** The selected kid, or the first active kid when none is selected or the selection was archived. */
export function useKid(): Kid | null {
  const { currentKidId } = useStore()
  const kids = useKids()
  return kids.find((k) => k.id === currentKidId) ?? kids[0] ?? null
}
