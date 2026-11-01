import { useCallback, useMemo, useState } from 'react'
import { dateKey } from '../../engine/dates'
import { perfectDay } from '../../engine/streaks'
import type { Kid } from '../../engine/types'
import { useStore } from '../../state/store'
import { TabBar, type TabDef } from '../primitives/TabBar'
import { BadgesTab } from './BadgesTab'
import { Celebration } from './Celebration'
import { Hero } from './Hero'
import { JarsTab } from './JarsTab'
import { TodayTab } from './TodayTab'
import { WeekTab } from './WeekTab'
import '../../styles/kid.css'

const TABS: TabDef[] = [
  { id: 'today', icon: 'today', label: 'Today' },
  { id: 'week', icon: 'week', label: 'Week' },
  { id: 'jars', icon: 'jars', label: 'Jars' },
  { id: 'badges', icon: 'badge', label: 'Badges' },
]

function Board({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const [tab, setTab] = useState('today')
  // Starts at 1 so the buddy hops once when the board appears for this kid.
  const [hopKey, setHopKey] = useState(1)
  const today = dateKey(now)
  const perfect = useMemo(
    () => (family ? perfectDay(family, kid, events, today, now) : false),
    [family, kid, events, today, now],
  )
  const hop = useCallback(() => setHopKey((k) => k + 1), [])

  return (
    <div className="kb">
      <Hero kid={kid} hopKey={hopKey} />
      <div className="kb-right">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        <div className="kb-panel" role="region" aria-label={TABS.find((t) => t.id === tab)?.label}>
          {tab === 'today' ? <TodayTab kid={kid} onChecked={hop} /> : null}
          {tab === 'week' ? <WeekTab /> : null}
          {tab === 'jars' ? <JarsTab /> : null}
          {tab === 'badges' ? <BadgesTab /> : null}
        </div>
      </div>
      <Celebration kid={kid} date={today} perfect={perfect} />
    </div>
  )
}

/** Keyed by kid so tab and animation state reset whenever the kid changes. */
export function KidBoard({ kid }: { kid: Kid }) {
  return <Board key={kid.id} kid={kid} />
}
