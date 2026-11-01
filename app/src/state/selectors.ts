import { useMemo } from 'react'
import { dateKey } from '../engine/dates'
import { currentWeekStart, kidUsesCents } from '../engine/closeWeeks'
import { jars, type Jars } from '../engine/jars'
import { streak, unverified, weekStatesFor } from '../engine/streaks'
import { weekState, type WeekState } from '../engine/week'
import type { DateKey, Kid } from '../engine/types'
import { badges, type BadgeDef } from '../content/badges'
import { useStore } from './store'

/**
 * Selectors recompute when the ledger changes (length or last id), the family changes,
 * the kid changes, or the minute tick moves `now`.
 */
function useLedgerKey(): string {
  const { events } = useStore()
  return `${events.length}:${events.length > 0 ? events[events.length - 1].id : ''}`
}

export function useWeek(kid: Kid): WeekState {
  const { family, events, now } = useStore()
  const key = useLedgerKey()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return weekState(family, kid, events, currentWeekStart(family, now), now)
  }, [family, kid, key, now])
}

export function useJars(kid: Kid): Jars {
  const { events } = useStore()
  const key = useLedgerKey()
  return useMemo(() => jars(kid.id, events), [kid.id, key])
}

export function useBadges(kid: Kid): { def: BadgeDef; earnedAt: string | null }[] {
  const { family, events, now } = useStore()
  const key = useLedgerKey()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return badges({
      family, kid, events, now,
      jars: jars(kid.id, events),
      weeks: weekStatesFor(family, kid, events, now),
    })
  }, [family, kid, key, now])
}

export function useUnverified(kid: Kid): { choreId: string; date: DateKey }[] {
  const { family, events, now } = useStore()
  const key = useLedgerKey()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return unverified(family, kid, events, now)
  }, [family, kid, key, now])
}

export function useStreak(kid: Kid): number {
  const { family, events, now } = useStore()
  const key = useLedgerKey()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return streak(family, kid, events, dateKey(now), now)
  }, [family, kid, key, now])
}

export function useKidUsesCents(kid: Kid): boolean {
  const { family, events, now } = useStore()
  const key = useLedgerKey()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return kidUsesCents(family, kid, events, now)
  }, [family, kid, key, now])
}
