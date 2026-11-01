import { useEffect, useMemo, useRef } from 'react'
import { THEMES } from '../../config/themes'
import { dateKey } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import { choreDayStateLive, liveEvents } from '../../engine/week'
import type { Grade, Kid } from '../../engine/types'
import { useJars, useStreak, useWeek } from '../../state/selectors'
import { useActions, useKid, useKids, useStore } from '../../state/store'
import { ChoreIcon } from '../kid/ChoreIcon'
import { routinesDue, choresDue } from '../kid/choreRows'
import { mathLineText } from '../kid/MathLine'
import { Icon } from '../primitives/Icon'
import { TvClock } from './TvClock'
import '../../styles/kid.css'
import '../../styles/tv.css'

const ROTATE_MS = 20_000
const MAX_ROWS = 6

const GRADE_LABEL: Record<Grade, string> = {
  'Pre-K': 'Pre-K', K: 'Kindergarten', '1st': '1st grade', '2nd': '2nd grade', '3rd+': '3rd grade and up',
}

function KidPanel({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const ws = useWeek(kid)
  const jars = useJars(kid)
  const streak = useStreak(kid)
  const live = useMemo(() => liveEvents(events), [events])
  const today = dateKey(now)
  const fmt = (c: number): string => formatCents(c, { cents: ws.useCents })

  const total = ws.start + ws.pay
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((ws.balance / total) * 100))) : 0

  const left = useMemo(() => {
    if (!family) return []
    return choresDue(kid, today).filter((c) => {
      const s = choreDayStateLive(family, kid, c, today, live, now)
      return !s.checked || s.rejected
    })
  }, [family, kid, today, live, now])

  const routines = useMemo(() => {
    if (!family) return []
    return routinesDue(family, kid, today).map((r) => {
      const done = r.steps.filter((st) => {
        let v = false
        for (const e of live) {
          if (e.type === 'routine.step' && e.kidId === kid.id && e.routineId === r.id && e.stepId === st.id && e.date === today) v = e.done
        }
        return v
      }).length
      return { id: r.id, name: r.name, done, total: r.steps.length }
    })
  }, [family, kid, today, live])

  const src = `${import.meta.env.BASE_URL}buddies/${THEMES[kid.theme].img}`
  const shown = left.slice(0, MAX_ROWS)

  return (
    <div className="tv-stage">
      <section className="tv-hero" aria-label={`${kid.name}'s week`}>
        <div className="tv-buddy-wrap">
          <img className="tv-buddy" src={src} alt="" draggable={false} />
        </div>
        <h1 className="tv-name">{kid.name}</h1>
        <p className="tv-grade">{GRADE_LABEL[kid.grade]}</p>
        <p className="tv-balance" aria-label={`Balance ${fmt(ws.balance)}`}>{fmt(ws.balance)}</p>
        <div className="tv-bar" role="progressbar" aria-label="Balance this week" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="tv-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="tv-math">{mathLineText(ws)}</p>
        <p className="tv-streak"><Icon name="flame" size={40} filled /> Streak: {streak} {streak === 1 ? 'day' : 'days'}</p>
      </section>

      <section className="tv-side">
        <div className="qb-card tv-todo">
          <h2>Still to do today</h2>
          {shown.length > 0 ? (
            <ul>
              {shown.map((c) => (
                <li key={c.id}>
                  <span className="tv-tile"><ChoreIcon name={c.icon} size={36} /></span>
                  <span className="tv-todo-label">{c.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tv-alldone"><Icon name="check" size={56} /> All done for today</p>
          )}
          {left.length > MAX_ROWS ? <p className="tv-more">and {left.length - MAX_ROWS} more</p> : null}
          {routines.length > 0 ? (
            <ul className="tv-routines" aria-label="Routines">
              {routines.map((r) => (
                <li key={r.id} data-complete={r.done === r.total ? 'true' : undefined}>
                  <span>{r.name}</span><b>{r.done}/{r.total}</b>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <dl className="tv-stats">
          <div className="tv-stat tv-stat-save"><dt>Saved</dt><dd><b>{formatCents(jars.save)}</b></dd></div>
          <div className="tv-stat tv-stat-give"><dt>Given</dt><dd><b>{formatCents(jars.give)}</b></dd></div>
          <div className="tv-stat tv-stat-left"><dt>Chores left</dt><dd><b>{left.length}</b></dd></div>
        </dl>
      </section>
    </div>
  )
}

/** Read-only wall display. Rotates through the kids every 20 seconds. Renders no buttons or links. */
export function TvBoard() {
  const { now } = useStore()
  const { setKid } = useActions()
  const kids = useKids()
  const kid = useKid()

  // One interval for the board's life. The ref lets the tick see the latest kids and selection.
  const latest = useRef({ kids, kidId: kid?.id ?? null })
  latest.current = { kids, kidId: kid?.id ?? null }
  const rotating = kids.length > 1
  useEffect(() => {
    if (!rotating) return
    const id = window.setInterval(() => {
      const { kids: ks, kidId } = latest.current
      if (ks.length < 2) return
      const i = ks.findIndex((k) => k.id === kidId)
      setKid(ks[(i + 1) % ks.length].id)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [rotating, setKid])

  if (!kid) {
    return (
      <main className="tv-board tv-empty">
        <TvClock now={now} />
        <p>Add a kid on the tablet to get started.</p>
      </main>
    )
  }

  return (
    <main className="tv-board">
      <TvClock now={now} />
      <KidPanel key={kid.id} kid={kid} />
      {kids.length > 1 ? (
        <ol className="tv-dots" aria-label="Kids">
          {kids.map((k) => (
            <li key={k.id} className="tv-dot" data-current={k.id === kid.id ? 'true' : undefined} aria-label={k.name} />
          ))}
        </ol>
      ) : null}
    </main>
  )
}
