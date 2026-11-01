import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { dateKey, dayFull, dayLabel } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { DateKey, Kid } from '../../engine/types'
import { useWeek } from '../../state/selectors'
import { ChoreIcon } from './ChoreIcon'
import { choresDue, routinesDue, Row, useDayToggles } from './choreRows'
import { DayDetail } from './DayDetail'

/** The shell swipes between kids on <main>; a sideways drag in the day row belongs to the row. */
const keepTouch = (e: TouchEvent): void => e.stopPropagation()

export function WeekTab({ kid, onChecked }: { kid: Kid; onChecked?: () => void }) {
  const ws = useWeek(kid)
  const { family, now, stateOf, stepDone, toggleChore } = useDayToggles(kid, onChecked)
  const today = dateKey(now)
  const [detail, setDetail] = useState<DateKey | null>(null)
  const scroller = useRef<HTMLUListElement>(null)

  // The sideways row only exists on phone widths; the wide grid leaves touches to the shell.
  const [wide, setWide] = useState(false)
  useEffect(() => {
    const measure = (): void => setWide((scroller.current?.clientWidth ?? 0) >= 640)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Phone: start the row at today.
  useEffect(() => {
    const el = scroller.current
    const card = el?.querySelector<HTMLElement>('[data-today="true"]')
    if (el && card) el.scrollLeft = card.offsetLeft - el.offsetLeft
  }, [])

  if (!family) return null

  return (
    <div className="kb-weekwrap">
      <ul className="kb-week" aria-label="Days of the week" ref={scroller} {...(wide ? {} : { onTouchStart: keepTouch, onTouchEnd: keepTouch })}>
        {ws.days.map((d) => {
          const future = d > today
          const isToday = d === today
          const lost = ws.lostByDay[d]?.amount ?? 0
          const net = future ? '·' : lost > 0 ? `-${formatCents(lost, { cents: ws.useCents })}` : '$0'
          const tone = future ? 'future' : lost > 0 ? 'bad' : 'good'
          const chores = choresDue(kid, d)
          const routines = routinesDue(family, kid, d)
          const steps = routines.reduce((n, r) => n + r.steps.length, 0)
          const stepsDone = routines.reduce((n, r) => n + r.steps.filter((s) => stepDone(r.id, s.id, d)).length, 0)
          return (
            <li key={d} className="kb-wk-card" data-date={d} data-today={isToday ? 'true' : undefined}>
              <button
                type="button"
                className={`kb-wk-head kb-day-${tone}`}
                aria-label={`Open ${dayFull(d)}`}
                onClick={() => setDetail(d)}
              >
                <span className="kb-wk-name">{dayLabel(d)}</span>
                <span className="kb-day-net">{net}</span>
              </button>
              <div className="kb-rows kb-wk-rows">
                {chores.map((c) => {
                  const s = stateOf(c, d)
                  return (
                    <Row
                      key={c.id}
                      label={c.label}
                      title={c.label}
                      state={s.box}
                      editable={isToday && !s.verified}
                      height={48}
                      lead={<span className="kb-row-ico"><ChoreIcon name={c.icon} /></span>}
                      tail={c.pay > 0 ? <span className="kb-pay">+{formatCents(c.pay)}</span> : null}
                      onToggle={() => toggleChore(c, d)}
                    />
                  )
                })}
              </div>
              {steps > 0 ? <p className="kb-wk-routines">Routines {stepsDone}/{steps}</p> : null}
            </li>
          )
        })}
      </ul>
      {detail ? <DayDetail kid={kid} date={detail} onClose={() => setDetail(null)} /> : null}
    </div>
  )
}
