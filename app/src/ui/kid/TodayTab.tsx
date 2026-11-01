import { useState } from 'react'
import { dateKey, dayFull } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { DateKey, Kid } from '../../engine/types'
import { useWeek } from '../../state/selectors'
import { EarnBackPanel } from '../earnback/EarnBackPanel'
import { SectionHead } from '../primitives/SectionHead'
import { choresDue, routinesDue, Row, useDayToggles } from './choreRows'
import { ChoreIcon } from './ChoreIcon'
import { DayStrip } from './DayStrip'

export function TodayTab({ kid, onChecked }: { kid: Kid; onChecked?: () => void }) {
  const { family, now, stateOf, stepDone, toggleChore, toggleStep } = useDayToggles(kid, onChecked)
  const ws = useWeek(kid)
  const today = dateKey(now)
  const [picked, setPicked] = useState<DateKey | null>(null)
  const selected = picked && ws.days.includes(picked) ? picked : today
  if (!family) return null

  const canEdit = selected === today
  const chores = choresDue(kid, selected)
  const done = chores.filter((c) => stateOf(c, selected).box !== 'empty').length
  const routines = routinesDue(family, kid, selected)

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
              state={stateOf(c, selected).box}
              editable={canEdit && !stateOf(c, selected).verified}
              height={56}
              lead={<span className="kb-row-ico"><ChoreIcon name={c.icon} /></span>}
              tail={c.pay > 0 ? <span className="kb-pay">+{formatCents(c.pay)}</span> : null}
              onToggle={() => toggleChore(c, selected)}
            />
          ))}
        </div>
      </section>
      {routines.map((r) => {
        const n = r.steps.filter((s) => stepDone(r.id, s.id, selected)).length
        return (
          <section key={r.id} className="kb-section" aria-label={r.name}>
            <SectionHead icon="routine" title={r.name} meta={`${n}/${r.steps.length}`} metaTone={n === r.steps.length && n > 0 ? 'good' : 'count'} />
            <div className="kb-rows">
              {r.steps.map((s) => (
                <Row
                  key={s.id}
                  label={s.label}
                  state={stepDone(r.id, s.id, selected) ? 'done' : 'empty'}
                  editable={canEdit}
                  height={48}
                  lead={null}
                  onToggle={() => toggleStep(r.id, s.id, selected)}
                />
              ))}
            </div>
          </section>
        )
      })}
      <EarnBackPanel kid={kid} onHop={onChecked} />
    </div>
  )
}
