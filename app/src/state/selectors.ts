import { useMemo } from 'react'
import { dateKey } from '../engine/dates'
import { currentWeekStart, kidUsesCents } from '../engine/closeWeeks'
import { jars, type Jars } from '../engine/jars'
import { streak, unverified, weekStatesFor } from '../engine/streaks'
import { weekState, type WeekState } from '../engine/week'
import type { DateKey, Kid } from '../engine/types'
import { badges, type BadgeDef } from '../content/badges'
import { useStore } from './store'
import { useDerived } from './derived'

/**
 * Selectors read the prepared ledger from useDerived, so the ledger is filtered and bucketed
 * once per version. They recompute when the ledger, the family, the kid or `now` changes.
 */

export function useWeek(kid: Kid): WeekState {
  const { family, events, now } = useStore()
  const prep = useDerived()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return weekState(family, kid, events, currentWeekStart(family, now), now, prep)
  }, [family, kid, prep, now])
}

export function useJars(kid: Kid): Jars {
  const { events } = useStore()
  const prep = useDerived()
  return useMemo(() => jars(kid.id, events, prep), [kid.id, prep])
}

/** Badges change at most once a day from the clock, so they key on the date, not the minute. */
export function useBadges(kid: Kid): { def: BadgeDef; earnedAt: string | null }[] {
  const { family, events, now } = useStore()
  const prep = useDerived()
  const day = dateKey(now)
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return badges({
      family, kid, events, now, prep,
      jars: jars(kid.id, events, prep),
      weeks: weekStatesFor(family, kid, events, now, prep),
    })
  }, [family, kid, prep, day])
}

export function useUnverified(kid: Kid): { choreId: string; date: DateKey }[] {
  const { family, events, now } = useStore()
  const prep = useDerived()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return unverified(family, kid, events, now, prep)
  }, [family, kid, prep, now])
}

export function useStreak(kid: Kid): number {
  const { family, events, now } = useStore()
  const prep = useDerived()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return streak(family, kid, events, dateKey(now), now, prep)
  }, [family, kid, prep, now])
}

export function useKidUsesCents(kid: Kid): boolean {
  const { family, events, now } = useStore()
  const prep = useDerived()
  return useMemo(() => {
    if (!family) throw new Error('No family loaded')
    return kidUsesCents(family, kid, events, now, prep)
  }, [family, kid, prep, now])
}
