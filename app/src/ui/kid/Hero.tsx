import { THEMES } from '../../config/themes'
import type { Grade, Kid } from '../../engine/types'
import { formatCents } from '../../engine/money'
import { displayBalance } from '../../engine/week'
import { useJars, useWeek } from '../../state/selectors'
import { Icon } from '../primitives/Icon'
import { MathLine } from './MathLine'

const GRADE_LABEL: Record<Grade, string> = {
  'Pre-K': 'Pre-K', K: 'Kindergarten', '1st': '1st grade', '2nd': '2nd grade', '3rd+': '3rd grade and up',
}

interface HeroProps {
  kid: Kid
  /** Changes when the buddy should hop once. 0 means no hop. */
  hopKey: number
}

export function Hero({ kid, hopKey }: HeroProps) {
  const ws = useWeek(kid)
  const jars = useJars(kid)
  const total = ws.start + ws.pay
  const shown = displayBalance(ws)
  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((shown / total) * 100))) : 0
  const fmt = (c: number): string => formatCents(c, { cents: ws.useCents })
  const src = `${import.meta.env.BASE_URL}buddies/${THEMES[kid.theme].img}`
  return (
    <section className="kb-hero" aria-label={`${kid.name}'s week`}>
      <div className="kb-buddy-wrap">
        <img
          key={hopKey}
          className={hopKey > 0 ? 'kb-buddy kb-hop' : 'kb-buddy'}
          src={src}
          alt=""
          draggable={false}
        />
        {kid.photo ? <img className="kb-photo" src={kid.photo} alt="" draggable={false} /> : null}
      </div>
      <div className="kb-hero-main">
        <div className="kb-who">
          <h2 className="kb-name">{kid.name}</h2>
          <span className="kb-grade">{GRADE_LABEL[kid.grade]}</span>
        </div>
        <p className="kb-balance" aria-label={`Balance ${fmt(shown)}`}>{fmt(shown)}</p>
        <div className="kb-bar" role="progressbar" aria-label="Balance this week" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div className="kb-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <MathLine ws={ws} />
        <ul className="kb-jars" aria-label="Jars">
          <li className="kb-jarchip kb-jar-save"><Icon name="save" size={18} /><span>Save</span><b>{formatCents(jars.save)}</b></li>
          <li className="kb-jarchip kb-jar-spend"><Icon name="spend" size={18} /><span>Spend</span><b>{formatCents(jars.spend)}</b></li>
          <li className="kb-jarchip kb-jar-give"><Icon name="give" size={18} /><span>Give</span><b>{formatCents(jars.give)}</b></li>
        </ul>
      </div>
    </section>
  )
}
