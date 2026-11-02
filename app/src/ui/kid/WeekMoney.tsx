import type { TouchEvent } from 'react'
import { dayFull } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { DateKey } from '../../engine/types'
import { mathTerms, type WeekState } from '../../engine/week'
import { useStore } from '../../state/store'
import { Icon } from '../primitives/Icon'
import { Modal } from '../primitives/Modal'
import { mathLineText } from './MathLine'

const keepTouch = (e: TouchEvent): void => e.stopPropagation()

interface Line {
  key: string
  sign: '+' | '-'
  amount: number
  label: string
  emoji?: string
}

/** The week's money, day by day: every amount added or lost and the reason for it. */
export function WeekMoney({ ws, onClose }: { ws: WeekState; onClose(): void }) {
  const { family } = useStore()
  const days = [...new Set([...Object.keys(ws.addedByDay), ...Object.keys(ws.lostByDay)])].sort() as DateKey[]
  const t = mathTerms(ws)
  const earnedBackRaw = Object.values(ws.addedByDay).flat().filter((a) => a.kind === 'earnback').reduce((n, a) => n + a.amount, 0)

  const linesFor = (date: DateKey): Line[] => [
    ...(ws.addedByDay[date] ?? []).map((a, i) => ({ key: `a${i}`, sign: '+' as const, amount: a.amount, label: a.label })),
    ...(ws.lostByDay[date]?.items ?? []).map((l) => ({
      key: l.eventId,
      sign: '-' as const,
      amount: l.amount,
      label: l.label,
      emoji: family?.reasons.find((r) => r.id === l.reasonId)?.emoji,
    })),
  ]

  return (
    <Modal open title="This week's money" onClose={onClose} className="kb-detail">
      <div onTouchStart={keepTouch} onTouchEnd={keepTouch} className="kb-detail-body">
        <div className="kb-detail-head">
          <h2 className="kb-detail-title">This week&apos;s money</h2>
          <button type="button" className="kb-detail-x" aria-label="Close" onClick={onClose}><Icon name="x" size={24} /></button>
        </div>

        {t.start > 0 ? (
          <p className="kb-wm-line kb-wm-start"><span>Started the week with</span><b>{formatCents(t.start)}</b></p>
        ) : null}

        {days.length === 0 ? <p className="kb-empty">Nothing added or lost yet this week.</p> : null}
        {days.map((date) => (
          <section key={date} className="kb-detail-sec" aria-label={dayFull(date)}>
            <h3 className="kb-detail-h">{dayFull(date)}</h3>
            <ul className="kb-detail-list">
              {linesFor(date).map((l) => (
                <li key={l.key} className="kb-wm-line" data-sign={l.sign === '+' ? 'add' : 'lose'}>
                  <span>
                    {l.emoji ? <span aria-hidden="true">{l.emoji} </span> : null}
                    {l.label}
                  </span>
                  <b>{l.sign === '+' ? '+' : '−'}{formatCents(l.amount)}</b>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {earnedBackRaw > ws.earnback ? (
          <p className="st-hint">Earning back can only win back what was lost, so it counts as {formatCents(ws.earnback)}.</p>
        ) : null}

        <p className="kb-wm-total">{mathLineText(ws)}</p>
      </div>
    </Modal>
  )
}
