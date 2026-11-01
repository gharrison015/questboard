import { useMemo, useState, type ReactNode } from 'react'
import { choreDayStateLive, liveEvents } from '../../engine/week'
import { dateKey, dayFull, parseKey } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import { newId } from '../../engine/ids'
import type { Chore, DateKey, Kid } from '../../engine/types'
import { useWeek } from '../../state/selectors'
import { useActions, useStore } from '../../state/store'
import { EarnBackSlot } from '../earnback/EarnBackPanel'
import { Icon } from '../primitives/Icon'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { ChoreIcon } from './ChoreIcon'
import { DayStrip } from './DayStrip'

type BoxState = 'empty' | 'pending' | 'done' | 'verified'

function Box({ state }: { state: BoxState }) {
  return (
    <span className="kb-box" data-state={state} aria-hidden="true">
      {state === 'done' || state === 'verified' ? <Icon name="check" size={20} /> : null}
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
  height: 56 | 48
  lead: ReactNode
  tail?: ReactNode
  onToggle(): void
}

function Row({ label, state, editable, height, lead, tail, onToggle }: RowProps) {
  return (
    <button
      type="button"
      className="kb-row"
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

export function TodayTab({ kid, onChecked }: { kid: Kid; onChecked?: () => void }) {
  const { family, events, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const ws = useWeek(kid)
  const today = dateKey(now)
  const [picked, setPicked] = useState<DateKey | null>(null)
  const selected = picked && ws.days.includes(picked) ? picked : today
  const live = useMemo(() => liveEvents(events), [events])
  if (!family) return null

  const dow = parseKey(selected).getDay()
  const canEdit = selected === today
  const chores = kid.chores.filter((c) => c.active && c.days.includes(dow))
  const stateOf = (c: Chore): { box: BoxState; verified: boolean; rejected: boolean } => {
    const s = choreDayStateLive(family, kid, c, selected, live, now)
    const box: BoxState = !s.checked || s.rejected ? 'empty' : s.verified ? 'verified' : s.pending ? 'pending' : 'done'
    return { box, verified: s.verified, rejected: s.rejected }
  }
  const done = chores.filter((c) => stateOf(c).box !== 'empty').length

  const toggleChore = (c: Chore): void => {
    const s = stateOf(c)
    if (s.verified) return
    const base = { id: newId(), at: new Date().toISOString(), kidId: kid.id, choreId: c.id, date: selected }
    if (s.box === 'empty') {
      void append([{ ...base, type: 'chore.checked' }])
      toast.show(`Nice work! ${c.label}`)
      onChecked?.()
    } else {
      void append([{ ...base, type: 'chore.unchecked' }])
    }
  }

  const stepDone = (routineId: string, stepId: string): boolean => {
    let v = false
    for (const e of live) {
      if (e.type === 'routine.step' && e.kidId === kid.id && e.routineId === routineId && e.stepId === stepId && e.date === selected) v = e.done
    }
    return v
  }
  const toggleStep = (routineId: string, stepId: string): void => {
    void append([{
      id: newId(), at: new Date().toISOString(), type: 'routine.step',
      kidId: kid.id, routineId, stepId, date: selected, done: !stepDone(routineId, stepId),
    }])
  }
  const routines = kid.routineIds
    .map((id) => family.routines.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => !!r && r.days.includes(dow))

  const title = selected === today ? "Today's chores" : `${dayFull(selected)} chores`
  return (
    <div className="kb-tab">
      <DayStrip ws={ws} selected={selected} today={today} onSelect={setPicked} />
      <section className="kb-section" aria-label={title}>
        <SectionHead icon="chores" title={title} meta={`${done}/${chores.length}`} metaTone={chores.length > 0 && done === chores.length ? 'good' : 'count'} />
        {chores.length === 0 ? <p className="kb-empty">No chores on this day.</p> : null}
        <div className="kb-rows">
          {chores.map((c) => (
            <Row
              key={c.id}
              label={c.label}
              state={stateOf(c).box}
              editable={canEdit && !stateOf(c).verified}
              height={56}
              lead={<span className="kb-row-ico"><ChoreIcon name={c.icon} /></span>}
              tail={c.pay > 0 ? <span className="kb-pay">+{formatCents(c.pay)}</span> : null}
              onToggle={() => toggleChore(c)}
            />
          ))}
        </div>
      </section>
      {routines.map((r) => {
        const n = r.steps.filter((s) => stepDone(r.id, s.id)).length
        return (
          <section key={r.id} className="kb-section" aria-label={r.name}>
            <SectionHead icon="routine" title={r.name} meta={`${n}/${r.steps.length}`} metaTone={n === r.steps.length && n > 0 ? 'good' : 'count'} />
            <div className="kb-rows">
              {r.steps.map((s) => (
                <Row
                  key={s.id}
                  label={s.label}
                  state={stepDone(r.id, s.id) ? 'done' : 'empty'}
                  editable={canEdit}
                  height={48}
                  lead={null}
                  onToggle={() => toggleStep(r.id, s.id)}
                />
              ))}
            </div>
          </section>
        )
      })}
      <EarnBackSlot kid={kid} />
    </div>
  )
}
