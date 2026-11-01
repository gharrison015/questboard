import type { TouchEvent } from 'react'
import { dateKey, dayFull } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { DateKey, Kid } from '../../engine/types'
import { useWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Icon } from '../primitives/Icon'
import { Modal } from '../primitives/Modal'
import { ChoreIcon } from './ChoreIcon'
import { choresDue, routinesDue, Row, useDayToggles } from './choreRows'

const keepTouch = (e: TouchEvent): void => e.stopPropagation()

interface DayDetailProps {
  kid: Kid
  date: DateKey
  onClose(): void
}

/** Read-only look at one day: money, deductions, chores and routine steps. */
export function DayDetail({ kid, date, onClose }: DayDetailProps) {
  const { family, now } = useStore()
  const ws = useWeek(kid)
  const { stateOf, stepDone } = useDayToggles(kid)
  if (!family) return null

  const future = date > dateKey(now)
  const lost = ws.lostByDay[date]
  const items = lost?.items ?? []
  const earned = ws.payByDay[date] ?? 0
  const money: string[] = []
  if (future) money.push('Coming up')
  else {
    if (earned > 0) money.push(`+${formatCents(earned)} earned`)
    money.push(lost && lost.amount > 0 ? `-${formatCents(lost.amount)} lost` : 'Nothing lost today')
  }
  const chores = choresDue(kid, date)
  const routines = routinesDue(family, kid, date)

  return (
    <Modal open title={dayFull(date)} onClose={onClose} className="kb-detail">
      <div onTouchStart={keepTouch} onTouchEnd={keepTouch} className="kb-detail-body">
      <div className="kb-detail-head">
        <h2 className="kb-detail-title">{dayFull(date)}</h2>
        <button type="button" className="kb-detail-x" aria-label="Close" onClick={onClose}><Icon name="x" size={24} /></button>
      </div>
      <p className="kb-detail-money" data-tone={future ? 'future' : lost && lost.amount > 0 ? 'bad' : 'good'}>
        {money.join(', ')}
      </p>

      {items.length > 0 ? (
        <section className="kb-detail-sec" aria-label="Deductions">
          <h3 className="kb-detail-h">What was lost</h3>
          <ul className="kb-detail-list" aria-label="Deductions">
            {items.map((it) => {
              const emoji = family.reasons.find((r) => r.id === it.reasonId)?.emoji
              return (
                <li key={it.eventId} className="kb-detail-item">
                  {emoji ? <span aria-hidden="true">{emoji}</span> : null}
                  <span>{it.label}, -{formatCents(it.amount)}</span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <section className="kb-detail-sec" aria-label="Chores">
        <h3 className="kb-detail-h">Chores</h3>
        {chores.length === 0 ? <p className="kb-empty">No chores on this day.</p> : null}
        <div className="kb-rows">
          {chores.map((c) => (
            <Row
              key={c.id}
              label={c.label}
              state={stateOf(c, date).box}
              editable={false}
              height={48}
              lead={<span className="kb-row-ico"><ChoreIcon name={c.icon} /></span>}
              tail={c.pay > 0 ? <span className="kb-pay">+{formatCents(c.pay)}</span> : null}
              onToggle={() => {}}
            />
          ))}
        </div>
      </section>

      {routines.map((r) => (
        <section key={r.id} className="kb-detail-sec" aria-label={r.name}>
          <h3 className="kb-detail-h">{r.name}</h3>
          <div className="kb-rows">
            {r.steps.map((s) => (
              <Row
                key={s.id}
                label={s.label}
                state={stepDone(r.id, s.id, date) ? 'done' : 'empty'}
                editable={false}
                height={48}
                lead={null}
                onToggle={() => {}}
              />
            ))}
          </div>
        </section>
      ))}

      <button type="button" className="kb-detail-close" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}
