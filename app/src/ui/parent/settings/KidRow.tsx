import { useRef } from 'react'
import type { Grade, Kid, MoneySettings } from '../../../engine/types'
import { useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { useToast } from '../../primitives/Toaster'
import { BuddyChoice } from './BuddyChoice'
import { ConfirmButton, MoneyInput, MoveButtons, TextField, useSave } from './fields'
import { resizePhoto } from './photo'

export const GRADES: Grade[] = ['Pre-K', 'K', '1st', '2nd', '3rd+']

interface KidRowProps { kid: Kid; index: number; count: number; onMove(delta: -1 | 1): void }

export function KidRow({ kid, index, count, onMove }: KidRowProps) {
  const { family } = useStore()
  const save = useSave()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  if (!family) return null
  const patch = (p: Partial<Kid>): void => { void save({ type: 'kid.update', id: kid.id, patch: p }) }
  const ov = kid.moneyOverrides
  const setOverride = (p: Partial<MoneySettings>): void => {
    void save({ type: 'money.kidOverride', kidId: kid.id, overrides: { ...ov, ...p } })
  }
  const shown = { ...family.money, ...ov }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    resizePhoto(f).then((photo) => patch({ photo })).catch((err: unknown) => toast.show(err instanceof Error ? err.message : 'Could not read that photo.'))
  }

  return (
    <li className="st-card" aria-label={kid.name}>
      <div className="st-row st-row-wrap">
        {kid.photo ? <img className="st-photo" src={kid.photo} alt="" width={48} height={48} /> : null}
        <TextField label={`Name of ${kid.name}`} hideLabel required value={kid.name} onCommit={(v) => { if (v.trim()) patch({ name: v.trim() }) }} />
        <div className="st-field">
          <label htmlFor={`grade-${kid.id}`} className="st-sr">{`Grade for ${kid.name}`}</label>
          <select id={`grade-${kid.id}`} className="st-input" value={kid.grade} onChange={(e) => patch({ grade: e.target.value as Grade })}>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <MoveButtons index={index} count={count} what={kid.name} onMove={onMove} />
      </div>
      <BuddyChoice label={`Buddy for ${kid.name}`} value={kid.theme} onPick={(theme) => patch({ theme })} />
      <div className="st-row st-row-wrap">
        <input ref={file} type="file" accept="image/*" capture="user" className="st-sr" aria-label={`Photo for ${kid.name}`} onChange={onFile} />
        <Button className="pr-dense" variant="quiet" icon="photo" onClick={() => file.current?.click()}>{kid.photo ? 'Change photo' : 'Add photo'}</Button>
        {kid.photo ? <Button className="pr-dense" variant="quiet" onClick={() => patch({ photo: undefined })}>Remove photo</Button> : null}
      </div>
      <label className="st-check">
        <input
          type="checkbox"
          checked={ov !== undefined}
          aria-label={`Own money rules for ${kid.name}`}
          onChange={(e) => {
            const overrides = e.target.checked
              ? { startAmount: family.money.startAmount, deductionDefault: family.money.deductionDefault, chorePayDefault: family.money.chorePayDefault }
              : null
            void save({ type: 'money.kidOverride', kidId: kid.id, overrides })
          }}
        />
        <span>Own money rules (otherwise this kid follows the family)</span>
      </label>
      {ov ? (
        <div className="st-grid">
          <MoneyInput label={`Start amount for ${kid.name}`} value={shown.startAmount} onCommit={(c) => setOverride({ startAmount: c ?? 0 })} />
          <MoneyInput label={`Deduction for ${kid.name}`} value={shown.deductionDefault} onCommit={(c) => setOverride({ deductionDefault: c ?? 0 })} />
          <MoneyInput label={`Pay per new chore for ${kid.name}`} value={shown.chorePayDefault} onCommit={(c) => setOverride({ chorePayDefault: c ?? 0 })} />
        </div>
      ) : null}
      <ConfirmButton
        label="Archive"
        confirmLabel="Confirm archive"
        ariaLabel={kid.name}
        onConfirm={() => { void save({ type: 'kid.archive', id: kid.id }, `${kid.name} archived`) }}
      />
    </li>
  )
}
