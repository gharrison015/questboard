import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
  type ReactNode,
} from 'react'
import { applyFamilyAction, type FamilyAction } from '../engine/reducer'
import { currentWeekStart, dueWeekCloses } from '../engine/closeWeeks'
import type { Family, Kid, QBEvent } from '../engine/types'
import { detectMode, type Mode } from '../app/mode'
import { resolveAppearance, type ResolvedAppearance } from '../app/appearance'
import { useViewport } from '../app/useViewport'
import { verifyPin } from '../security/pin'
import { isLocked, PARENT_SESSION_MS, sessionValid, tryUnlock, type LockoutState } from '../security/session'
import { DEFAULT_DEVICE, EMPTY_LOCKOUT, type DeviceSettings, type StorageAdapter } from '../storage/adapter'
import { LoadError } from '../ui/shell/LoadError'
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

export type PinResult = 'ok' | 'bad' | 'locked'

export interface Actions {
  append(events: QBEvent[]): Promise<void>
  /** Every action runs through one queue, so overlapping calls apply in order. Unmatched ids in a family action (unknown kid, chore, routine) are no-ops. Limit breaches throw LimitError. */
  update(action: FamilyAction): Promise<void>
  setKid(id: string): void
  /** Opens the parent view. A no-op unless the parent session is valid. Only the gate success path calls it. */
  enterParent(): void
  setDevice(patch: Partial<DeviceSettings>): Promise<void>
  unlockParent(pin: string): Promise<PinResult>
  /** Checks the PIN against the shared lockout without starting a parent session (Ruling 25). */
  confirmPin(pin: string): Promise<PinResult>
  lockParent(): void
  /** Counts one PIN-style attempt against the shared lockout. Five misses lock for 60 seconds. Does not open the parent session. */
  tryPin(check: () => Promise<boolean>): Promise<PinResult>
  /** Replaces everything in one storage transaction. On failure nothing changed, on disk or on screen. */
  replaceAll(family: Family, events: QBEvent[]): Promise<void>
  /** First-run setup: saves a finished family in one call and shows it. */
  createFamily(family: Family): Promise<void>
  /** Wipes storage and returns to the empty install, which shows the setup wizard. */
  eraseAll(): Promise<void>
}

const StoreCtx = createContext<StoreValue | null>(null)
const ActionsCtx = createContext<Actions | null>(null)

const TICK_MS = 60_000
const CHANNEL = 'qb'
const CLOSE_LOCK = 'qb-closes'

export function activeKids(family: Family | null): Kid[] {
  return (family?.kids ?? []).filter((k) => !k.archived).sort((a, b) => a.order - b.order)
}

/** Runs fn under the cross-tab close lock when the browser has one, so two tabs never close the same week. */
function withCloseLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks && typeof locks.request === 'function') return locks.request(CLOSE_LOCK, fn)
  return fn()
}

interface ChannelLike {
  postMessage(message: unknown): void
  close(): void
  onmessage: ((ev: MessageEvent) => void) | null
}

function openChannel(): ChannelLike | null {
  return typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : null
}

export function StoreProvider({ adapter, children }: { adapter: StorageAdapter; children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, undefined, (): StoreState => ({
    loaded: false, family: null, events: [], device: DEFAULT_DEVICE, lockout: EMPTY_LOCKOUT,
    currentKidId: null, parentUnlockedAt: null, view: 'kid', now: new Date(),
  }))
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // The ref is the source of truth for actions, so two calls in one tick see each other's results.
  const ref = useRef(state)
  const commit = useCallback((patch: Partial<StoreState>): void => {
    ref.current = { ...ref.current, ...patch }
    dispatch(patch)
  }, [])
  const viewport = useViewport()

  // One promise chain: each action starts after the previous one finished, success or failure.
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.current.then(fn)
    chain.current = run.then(() => undefined, () => undefined)
    return run
  }, [])

  const channel = useRef<ChannelLike | null>(null)
  const announce = useCallback((): void => {
    try { channel.current?.postMessage({ type: 'changed' }) } catch { /* channel closed */ }
  }, [])

  /**
   * Appends every due week close. Runs under the cross-tab lock and re-reads storage first, so a
   * close another tab already wrote is seen and never written twice. Returns the fresh ledger.
   */
  const appendDueCloses = useCallback(async (): Promise<{ family: Family | null; events: QBEvent[] }> => {
    return withCloseLock(async () => {
      const fresh = await adapter.load()
      if (!fresh.family) return { family: null, events: fresh.events }
      const closes = dueWeekCloses(fresh.family, fresh.events, new Date())
      if (closes.length === 0) return { family: fresh.family, events: fresh.events }
      await adapter.appendEvents(closes)
      announce()
      return { family: fresh.family, events: [...fresh.events, ...closes] }
    })
  }, [adapter, announce])

  /** Closes due weeks when there are any; a cheap check against memory first. */
  const closeDue = useCallback(async (): Promise<void> => {
    const { family, events } = ref.current
    if (!family || dueWeekCloses(family, events, new Date()).length === 0) return
    const fresh = await appendDueCloses()
    commit({ family: fresh.family, events: fresh.events })
  }, [appendDueCloses, commit])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const loaded = await adapter.load()
        if (cancelled) return
        let { family, events } = loaded
        if (family && dueWeekCloses(family, events, new Date()).length > 0) {
          const fresh = await appendDueCloses()
          family = fresh.family
          events = fresh.events
        }
        if (cancelled) return
        setLoadError(false)
        commit({
          loaded: true, family, events,
          device: loaded.device, lockout: loaded.lockout, now: new Date(),
        })
      } catch {
        if (!cancelled) setLoadError(true)
      }
    })()
    return () => { cancelled = true }
  }, [adapter, commit, appendDueCloses, attempt])

  // Another tab changed storage: read it back so this tab never acts on a stale ledger.
  useEffect(() => {
    const ch = openChannel()
    channel.current = ch
    if (!ch) return
    ch.onmessage = () => {
      void enqueue(async () => {
        const fresh = await adapter.load()
        commit({ family: fresh.family, events: fresh.events, lockout: fresh.lockout })
      }).catch(() => undefined)
    }
    return () => {
      ch.onmessage = null
      ch.close()
      if (channel.current === ch) channel.current = null
    }
  }, [adapter, commit, enqueue])

  // The clock. Crossing a week boundary closes the finished week right away, not on the next load.
  useEffect(() => {
    const tick = (): void => {
      const before = ref.current.now
      const next = new Date()
      commit({ now: next })
      const family = ref.current.family
      if (family && currentWeekStart(family, before) !== currentWeekStart(family, next)) {
        void enqueue(closeDue).catch(() => undefined)
      }
    }
    const id = window.setInterval(tick, TICK_MS)
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [commit, enqueue, closeDue])

  // The parent session ends at exactly five minutes, not on the next minute tick.
  useEffect(() => {
    const at = state.parentUnlockedAt
    if (at === null) return
    const left = Math.max(0, at + PARENT_SESSION_MS - Date.now())
    const id = window.setTimeout(() => {
      if (ref.current.parentUnlockedAt === at) commit({ parentUnlockedAt: null, view: 'kid', now: new Date() })
    }, left)
    return () => window.clearTimeout(id)
  }, [state.parentUnlockedAt, commit])

  const actions = useMemo<Actions>(() => {
    /** One counted attempt against the shared lockout. Call only from inside the queue. */
    const countAttempt = async (check: () => Promise<boolean>): Promise<{ result: PinResult; at: number }> => {
      const at = Date.now()
      if (isLocked(ref.current.lockout, at)) return { result: 'locked', at }
      const { state: next, result } = tryUnlock(await check(), ref.current.lockout, at)
      await adapter.saveLockout(next)
      commit({ lockout: next })
      return { result, at }
    }
    const pinCheck = (pin: string) => async (): Promise<boolean> => {
      const family = ref.current.family
      return !!family && verifyPin(pin, family.pinSalt, family.pinHash)
    }

    return {
      append: (events) => enqueue(async () => {
        if (events.length === 0) return
        await adapter.appendEvents(events)
        commit({ events: [...ref.current.events, ...events] })
        announce()
      }),
      update: (action) => enqueue(async () => {
        const family = ref.current.family
        if (!family) return
        const next = applyFamilyAction(family, action)
        await adapter.saveFamily(next)
        commit({ family: next })
        announce()
        // A week start change can leave a short span due right now (Ruling 22).
        if (action.type === 'money.set' || action.type === 'money.kidOverride') await closeDue()
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
        if (!ref.current.family) return 'bad' as const
        const { result, at } = await countAttempt(pinCheck(pin))
        if (result === 'ok') commit({ parentUnlockedAt: at })
        return result
      }),
      confirmPin: (pin) => enqueue(async () => {
        if (!ref.current.family) return 'bad' as const
        return (await countAttempt(pinCheck(pin))).result
      }),
      tryPin: (check) => enqueue(async () => (await countAttempt(check)).result),
      lockParent: () => commit({ parentUnlockedAt: null, view: 'kid' }),
      replaceAll: (family, events) => enqueue(async () => {
        const { device, lockout } = ref.current
        const closes = dueWeekCloses(family, events, new Date())
        const all = [...events, ...closes]
        await withCloseLock(() => adapter.replaceAll(family, all, { device, lockout }))
        commit({ family, events: all, currentKidId: null, view: 'kid' })
        announce()
      }),
      createFamily: (family) => enqueue(async () => {
        await adapter.saveFamily(family)
        commit({ family, currentKidId: null, view: 'kid' })
        announce()
      }),
      eraseAll: () => enqueue(async () => {
        await adapter.wipe()
        commit({
          family: null, events: [], device: DEFAULT_DEVICE, lockout: EMPTY_LOCKOUT,
          currentKidId: null, parentUnlockedAt: null, view: 'kid',
        })
        announce()
      }),
    }
  }, [adapter, commit, enqueue, announce, closeDue])

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

  if (loadError) return <LoadError onRetry={() => { setLoadError(false); setAttempt((n) => n + 1) }} />
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
