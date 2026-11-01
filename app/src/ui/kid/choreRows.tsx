import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { choreDayStateLive, liveEvents } from '../../engine/week'
import { parseKey } from '../../engine/dates'
import { newId } from '../../engine/ids'
import type { Chore, DateKey, Family, Kid, Routine } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { Icon } from '../primitives/Icon'
import { useToast } from '../primitives/Toaster'

export type BoxState = 'empty' | 'pending' | 'done' | 'verified'

export function Box({ state }: { state: BoxState }) {
  return (
    <span className="kb-box" data-state={state} aria-hidden="true">
      {state === 'done' || state === 'verified' ? <Icon name="check" size={20} /> : null}
      {state === 'pending' ? <Icon name="routine" size={16} /> : null}
    </span>
  )
}

const BOX_TEXT: Record<BoxState, string> = {
  empty: 'not done', pending: 'done, waiting for a check', done: 'done', verified: 'done and approved',
}

interface RowProps {
  label: string
  state: BoxState
  editable: boolean
  height: 56 | 48 | 40
  lead: ReactNode
  tail?: ReactNode
  onToggle(): void
  title?: string
}

export function Row({ title, label, state, editable, height, lead, tail, onToggle }: RowProps) {
  return (
    <button
      type="button"
      className="kb-row"
      title={title}
      data-h={height}
      data-state={state}
      aria-pressed={state !== 'empty'}
      aria-disabled={editable ? undefined : 'true'}
      onClick={editable ? onToggle : undefined}
    >
      {lead}
      <span className="kb-row-label">{label}<span className="qb-sr">, {BOX_TEXT[state]}</span></span>
      {tail}
      <Box state={state} />
    </button>
  )
}

/** Active chores due on the weekday of `date`. */
export function choresDue(kid: Kid, date: DateKey): Chore[] {
  const dow = parseKey(date).getDay()
  return kid.chores.filter((c) => c.active && c.days.includes(dow))
}

/** Routines assigned to the kid that run on the weekday of `date`. */
export function routinesDue(family: Family, kid: Kid, date: DateKey): Routine[] {
  const dow = parseKey(date).getDay()
  return kid.routineIds
    .map((id) => family.routines.find((r) => r.id === id))
    .filter((r): r is Routine => !!r && r.days.includes(dow))
}

export interface ChoreState { box: BoxState; verified: boolean; rejected: boolean }

/**
 * Chore and routine step state plus the toggle actions, shared by the Today and Week tabs.
 * The in-flight map remembers the desired state of a tap whose event is not in `events` yet,
 * so a fast second tap flips the right way.
 */
export function useDayToggles(kid: Kid, onChecked?: () => void) {
  const { family, events, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const live = useMemo(() => liveEvents(events), [events])
  const inflight = useRef(new Map<string, { want: boolean; eventId: string }>())
  useEffect(() => {
    const ids = new Set(events.map((e) => e.id))
    for (const [k, v] of inflight.current) if (ids.has(v.eventId)) inflight.current.delete(k)
  }, [events])

  const stateOf = useCallback((c: Chore, date: DateKey): ChoreState => {
    if (!family) return { box: 'empty', verified: false, rejected: false }
    const s = choreDayStateLive(family, kid, c, date, live, now)
    const box: BoxState = !s.checked || s.rejected ? 'empty' : s.verified ? 'verified' : s.pending && c.pay > 0 ? 'pending' : 'done'
    return { box, verified: s.verified, rejected: s.rejected }
  }, [family, kid, live, now])

  const stepDone = useCallback((routineId: string, stepId: string, date: DateKey): boolean => {
    let v = false
    for (const e of live) {
      if (e.type === 'routine.step' && e.kidId === kid.id && e.routineId === routineId && e.stepId === stepId && e.date === date) v = e.done
    }
    return v
  }, [live, kid.id])

  const toggleChore = (c: Chore, date: DateKey): void => {
    const s = stateOf(c, date)
    if (s.verified) return
    const key = `c:${c.id}:${date}`
    const pending = inflight.current.get(key)
    const checkedNow = pending ? pending.want : s.box !== 'empty'
    const base = { id: newId(), at: new Date().toISOString(), kidId: kid.id, choreId: c.id, date }
    inflight.current.set(key, { want: !checkedNow, eventId: base.id })
    if (!checkedNow) {
      void append([{ ...base, type: 'chore.checked' }])
      toast.show(`Nice work! ${c.label}`)
      onChecked?.()
    } else {
      void append([{ ...base, type: 'chore.unchecked' }])
    }
  }

  const toggleStep = (routineId: string, stepId: string, date: DateKey): void => {
    const key = `s:${routineId}:${stepId}:${date}`
    const pending = inflight.current.get(key)
    const doneNow = pending ? pending.want : stepDone(routineId, stepId, date)
    const id = newId()
    inflight.current.set(key, { want: !doneNow, eventId: id })
    void append([{
      id, at: new Date().toISOString(), type: 'routine.step',
      kidId: kid.id, routineId, stepId, date, done: !doneNow,
    }])
  }

  return { family, now, stateOf, stepDone, toggleChore, toggleStep }
}
