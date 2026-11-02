import { useState } from 'react'
import { formatCents } from '../../engine/money'
import { mathTerms, type WeekState } from '../../engine/week'
import { Icon } from '../primitives/Icon'
import { WeekMoney } from './WeekMoney'

const MINUS = '−'

/** The week's math as one line, zero terms left out. Keep: "$20 − $1.50 = $18.50". Earn: "$0 + $8 = $8". */
export function mathLineText(ws: WeekState): string {
  const t = mathTerms(ws)
  const f = (c: number): string => formatCents(c)
  const parts = [f(t.start)]
  if (t.plus > 0) parts.push(`+ ${f(t.plus)}`)
  if (t.minus > 0) parts.push(`${MINUS} ${f(t.minus)}`)
  return `${parts.join(' ')} = ${f(t.result)}`
}

/** The week's math as a button; tapping it opens the day-by-day breakdown with reasons. */
export function MathLine({ ws }: { ws: WeekState }) {
  const [open, setOpen] = useState(false)
  // Keep each operator with its amount so a wrap reads "$10 − $1.50" then "= $8.50", and keep
  // the info icon with the last amount so it never sits alone on a line.
  const text = mathLineText(ws).replace(/ ([−+=]) /g, ' $1\u00a0')
  const cut = text.lastIndexOf(' ') + 1
  return (
    <div className="kb-math">
      <button type="button" className="kb-math-eq" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {text.slice(0, cut)}
        <span className="kb-math-end">
          {text.slice(cut)}
          <Icon name="info" size={20} />
        </span>
        <span className="qb-sr">See how this week added up</span>
      </button>
      {open ? <WeekMoney ws={ws} onClose={() => setOpen(false)} /> : null}
    </div>
  )
}
