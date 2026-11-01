import { useEffect, useState } from 'react'
import { parseKey } from '../../engine/dates'
import { bestStreak } from '../../engine/streaks'
import type { Kid } from '../../engine/types'
import { useBadges, useStreak } from '../../state/selectors'
import { useStore } from '../../state/store'
import { SectionHead } from '../primitives/SectionHead'
import { BuddyPicker } from './BuddyPicker'

const seenKey = (kidId: string): string => `badges-seen:${kidId}`

function readSeen(kidId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(kidId))
    const list: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

function writeSeen(kidId: string, ids: string[]): void {
  try {
    localStorage.setItem(seenKey(kidId), JSON.stringify(ids))
  } catch {
    // Storage can be blocked; the pop just plays again next time.
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function earnedLabel(at: string): string {
  // Some badges report a plain date key, which must be read as a local day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(at) ? parseKey(at) : new Date(at)
  return `Earned ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

interface BadgesTabProps {
  kid: Kid
  onPicked?: () => void
}

export function BadgesTab({ kid, onPicked }: BadgesTabProps) {
  const { family, events, now } = useStore()
  const list = useBadges(kid)
  const current = useStreak(kid)
  const best = family ? Math.max(bestStreak(family, kid, events, now), current) : current
  const earnedIds = list.filter((b) => b.earnedAt).map((b) => b.def.id)
  const earnedKey = earnedIds.join(',')

  // Badges earned since the last visit pop once. Fixed at mount so the pop outlives the write below.
  const [fresh] = useState(() => {
    const seen = readSeen(kid.id)
    return new Set(earnedIds.filter((id) => !seen.has(id)))
  })
  useEffect(() => {
    writeSeen(kid.id, earnedKey ? earnedKey.split(',') : [])
  }, [kid.id, earnedKey])

  return (
    <div className="kb-tab">
      <section className="qb-card kb-badgecard" aria-label="Streak">
        <SectionHead icon="flame" title="Streak" />
        <div className="kb-streak">
          {kid.photo ? <img className="kb-streak-photo" src={kid.photo} alt="" draggable={false} /> : null}
          <p className="kb-streak-num">
            <b>{current}</b> <span>{current === 1 ? 'day' : 'days'}</span>
          </p>
          <p className="kb-streak-best">Best: {best}</p>
        </div>
      </section>

      <section className="qb-card kb-badgecard" aria-label="Badge collection">
        <SectionHead icon="badge" title="Badges" meta={`${earnedIds.length}/${list.length}`} />
        <ul className="kb-badgegrid">
          {list.map(({ def, earnedAt }) => (
            <li key={def.id} className="kb-badge" data-earned={earnedAt ? 'true' : 'false'} data-fresh={earnedAt && fresh.has(def.id) ? 'true' : 'false'}>
              <span className="kb-badge-emoji" aria-hidden="true">{def.emoji}</span>
              <span className="kb-badge-name">{def.name}</span>
              <span className="kb-badge-note">{earnedAt ? earnedLabel(earnedAt) : def.rule}</span>
            </li>
          ))}
        </ul>
      </section>

      <BuddyPicker kid={kid} onPicked={onPicked} />
    </div>
  )
}
