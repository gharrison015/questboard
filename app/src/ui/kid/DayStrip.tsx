import { dayFull, dayLabel } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { DateKey } from '../../engine/types'
import type { WeekState } from '../../engine/week'

interface DayStripProps {
  ws: WeekState
  selected: DateKey
  today: DateKey
  onSelect(day: DateKey): void
}

export function DayStrip({ ws, selected, today, onSelect }: DayStripProps) {
  return (
    <div className="kb-days" role="group" aria-label="Days this week">
      {ws.days.map((d) => {
        const future = d > today
        const lost = ws.lostByDay[d]?.amount ?? 0
        const net = future ? '' : lost > 0 ? `-${formatCents(lost, { cents: ws.useCents })}` : '$0'
        const tone = future ? 'future' : lost > 0 ? 'bad' : 'good'
        return (
          <button
            key={d}
            type="button"
            className={`kb-day kb-day-${tone}`}
            aria-pressed={d === selected}
            aria-label={`${dayLabel(d)}${future ? '' : `, ${lost > 0 ? `lost ${formatCents(lost, { cents: ws.useCents })}` : 'nothing lost'}`}`}
            data-today={d === today ? 'true' : undefined}
            title={dayFull(d)}
            onClick={() => onSelect(d)}
          >
            <span className="kb-day-name">{dayLabel(d)}</span>
            <span className="kb-day-net">{future ? '·' : net}</span>
          </button>
        )
      })}
    </div>
  )
}
