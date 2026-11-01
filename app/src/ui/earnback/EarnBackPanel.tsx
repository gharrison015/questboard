import { useState } from 'react'
import { subjectsFor, type Subject } from '../../content/skills'
import { effectiveMoney, formatCents } from '../../engine/money'
import type { Kid } from '../../engine/types'
import { earnBackRoom } from '../../engine/week'
import { useWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Card } from '../primitives/Card'
import { Icon, type IconName } from '../primitives/Icon'
import { SectionHead } from '../primitives/SectionHead'
import { ChallengeModal } from './ChallengeModal'

const SUBJECT_ICON: Record<Subject, IconName> = {
  Math: 'math',
  Counting: 'math',
  Shapes: 'collection',
  Colors: 'gift',
  'Sight Words': 'abc',
  Spelling: 'abc',
  Reading: 'read',
}

export function EarnBackPanel({ kid, onHop }: { kid: Kid; onHop?: () => void }) {
  const { family } = useStore()
  const ws = useWeek(kid)
  const [subject, setSubject] = useState<Subject | null>(null)
  if (!family) return null
  const money = effectiveMoney(family, kid)
  const room = earnBackRoom(ws)
  if (!money.earnBackEnabled || (room === 0 && !subject)) return null

  return (
    <Card className="kb-earnback" aria-label="Earn it back">
      <SectionHead icon="earn" title="Earn it back" meta={`up to ${formatCents(room)}`} metaTone="good" />
      <p className="kb-earnback-copy">Do a skill to win back money you lost.</p>
      <div className="kb-skills">
        {subjectsFor(kid.grade).map((s) => (
          <button key={s} type="button" className="kb-skill" onClick={() => setSubject(s)}>
            <span className="kb-skill-ico"><Icon name={SUBJECT_ICON[s]} size={28} /></span>
            <span className="kb-skill-name">{s}</span>
            <span className="kb-skill-pay">+{formatCents(money.earnBackPerCorrect)}</span>
          </button>
        ))}
      </div>
      {subject ? <ChallengeModal kid={kid} subject={subject} onClose={() => setSubject(null)} onHop={onHop} /> : null}
    </Card>
  )
}

/** Name used by the Today tab. */
export const EarnBackSlot = EarnBackPanel
