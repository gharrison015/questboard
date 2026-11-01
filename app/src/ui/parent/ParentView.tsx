import { useState } from 'react'
import { currentWeekStart, lastWeekMissedApprovals } from '../../engine/closeWeeks'
import { formatCents } from '../../engine/money'
import type { Kid } from '../../engine/types'
import { useJars, useWeek } from '../../state/selectors'
import { useKid, useStore } from '../../state/store'
import { MathLine } from '../kid/MathLine'
import { Button } from '../primitives/Button'
import { Card } from '../primitives/Card'
import { SectionHead } from '../primitives/SectionHead'
import { DeductPanel } from './DeductPanel'
import { PaydayPanel } from './PaydayPanel'
import { SettingsView } from './settings/SettingsView'
import { Shop } from './Shop'
import { ThisWeek } from './ThisWeek'
import { VerifyPanel } from './VerifyPanel'
import { useParent } from './useParent'
import '../../styles/kid.css'
import '../../styles/parent.css'

function BalanceCard({ kid }: { kid: Kid }) {
  const ws = useWeek(kid)
  const j = useJars(kid)
  return (
    <Card className="pr-balance" aria-label="Balance">
      <SectionHead icon="coin" title={kid.name} meta={ws.closed ? 'Week closed' : 'This week'} />
      <p className="pr-balance-amt">{formatCents(ws.balance)}</p>
      <MathLine ws={ws} />
      <p className="pr-line">
        Save {formatCents(j.save)}, Spend {formatCents(j.spend)}, Give {formatCents(j.give)}, to split {formatCents(j.unsplit)}
      </p>
    </Card>
  )
}

/** One dismissible note per kid per week. The dismissal is remembered on this device. */
function MissedNote({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const storageKey = family ? `missed-note:${kid.id}:${currentWeekStart(family, now)}` : ''
  const [gone, setGone] = useState<string | null>(null)
  if (!family) return null
  const missed = lastWeekMissedApprovals(family, kid, events, now)
  let dismissed = gone === storageKey
  try { dismissed = dismissed || localStorage.getItem(storageKey) === '1' } catch { /* storage blocked */ }
  if (missed <= 0 || dismissed) return null
  const dismiss = (): void => {
    try { localStorage.setItem(storageKey, '1') } catch { /* storage blocked */ }
    setGone(storageKey)
  }
  return (
    <p className="pr-note" role="note">
      <span>{missed} {missed === 1 ? 'approval' : 'approvals'} missed last week</span>
      <Button className="pr-dense" variant="quiet" aria-label="Dismiss note" onClick={dismiss}>Dismiss</Button>
    </p>
  )
}

/** Parent view. The shell shows the kids strip above it and only renders it inside a valid PIN session. */
export function ParentView() {
  const kid = useKid()
  const parent = useParent()
  const [settings, setSettings] = useState(false)
  if (!kid) return null

  return (
    <section className="pr-view" aria-label="Parent">
      <div className="pr-bar">
        <h2 className="pr-title">{settings ? 'Settings' : 'Parent'}</h2>
        {settings ? null : (
          <Button variant="quiet" icon="settings" onClick={() => setSettings(true)}>Settings</Button>
        )}
        <Button variant="quiet" icon="lock" onClick={parent.lock}>Lock</Button>
      </div>
      {settings ? <SettingsView onBack={() => setSettings(false)} /> : (
        <div className="pr-cols">
          <div className="pr-col">
            <BalanceCard kid={kid} />
            <DeductPanel kid={kid} />
            <MissedNote kid={kid} />
            <VerifyPanel kid={kid} />
          </div>
          <div className="pr-col">
            <ThisWeek kid={kid} />
            <PaydayPanel kid={kid} />
            <Shop kid={kid} />
          </div>
        </div>
      )}
    </section>
  )
}
