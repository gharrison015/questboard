import { useState, type ReactNode } from 'react'
import { useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { Icon, type IconName } from '../../primitives/Icon'
import { SectionHead } from '../../primitives/SectionHead'
import { AppearanceSettings } from './AppearanceSettings'
import { ChoresSection } from './ChoresSection'
import { DataSettings } from './DataSettings'
import { KidsEditor } from './KidsEditor'
import { MoneySettings } from './MoneySettings'
import { PayHandlesSettings } from './PayHandlesSettings'
import { ReasonsEditor } from './ReasonsEditor'
import { RoutinesEditor } from './RoutinesEditor'
import { VerificationSettings } from './VerificationSettings'
import '../../../styles/settings.css'

interface Section { id: string; title: string; icon: IconName; body: ReactNode }

const SECTIONS: Section[] = [
  { id: 'money', title: 'Money', icon: 'coin', body: <MoneySettings /> },
  { id: 'verification', title: 'Verification', icon: 'check', body: <VerificationSettings /> },
  { id: 'reasons', title: 'Reasons', icon: 'minus', body: <ReasonsEditor /> },
  { id: 'routines', title: 'Routines', icon: 'routine', body: <RoutinesEditor /> },
  { id: 'chores', title: 'Chores', icon: 'chores', body: <ChoresSection /> },
  { id: 'kids', title: 'Kids', icon: 'family', body: <KidsEditor /> },
  { id: 'appearance', title: 'Appearance', icon: 'settings', body: <AppearanceSettings /> },
  { id: 'pay', title: 'Pay handles', icon: 'pay', body: <PayHandlesSettings /> },
  { id: 'data', title: 'Data', icon: 'shield', body: <DataSettings /> },
]

/** Settings sub-screen. One open section at a time on a phone, every section as a card on a tablet. */
export function SettingsView({ onBack }: { onBack?: () => void }) {
  const { mode } = useStore()
  const [open, setOpen] = useState<string>('money')
  const phone = mode === 'phone'

  return (
    <section className="st-view" aria-label="Settings">
      {onBack ? <Button variant="quiet" className="st-back" onClick={onBack}>Back</Button> : null}
      <div className="st-sections" data-layout={phone ? 'stack' : 'cards'}>
        {SECTIONS.map((s) => {
          const expanded = !phone || open === s.id
          return (
            <section key={s.id} className="pr-section st-section" aria-label={s.title}>
              {phone ? (
                <button
                  type="button"
                  className="st-head"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? '' : s.id)}
                >
                  <Icon name={s.icon} size={22} />
                  <span className="st-head-title">{s.title}</span>
                  <Icon name="chev" size={22} />
                </button>
              ) : (
                <SectionHead icon={s.icon} title={s.title} />
              )}
              {expanded ? s.body : null}
            </section>
          )
        })}
      </div>
    </section>
  )
}
