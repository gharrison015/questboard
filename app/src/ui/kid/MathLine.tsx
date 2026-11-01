import { formatCents } from '../../engine/money'
import { dayLabel } from '../../engine/dates'
import { mathTerms, type WeekState } from '../../engine/week'

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

/** "Lost: $0.50 + $1 (Wed yelling, Fri not listening)", or null when nothing was lost. */
function whyText(ws: WeekState): string | null {
  const days = Object.keys(ws.lostByDay).sort()
  const items = days.flatMap((d) => ws.lostByDay[d].items.map((i) => ({ day: d, item: i })))
  if (items.length === 0) return null
  const f = (c: number): string => formatCents(c)
  const amounts = items.map((x) => f(x.item.amount)).join(' + ')
  const reasons = items.map((x) => `${dayLabel(x.day)} ${x.item.label.toLowerCase()}`).join(', ')
  return `Lost: ${amounts} (${reasons})`
}

export function MathLine({ ws }: { ws: WeekState }) {
  const why = whyText(ws)
  const t = mathTerms(ws)
  const keptOnly = t.plus === 0 && t.minus === 0 && t.start > 0
  return (
    <div className="kb-math">
      <p className="kb-math-eq">{mathLineText(ws)}</p>
      {why ? (
        <p className="kb-math-why">{why}</p>
      ) : keptOnly ? (
        <p className="kb-math-why">{formatCents(t.start)} kept so far</p>
      ) : null}
    </div>
  )
}
