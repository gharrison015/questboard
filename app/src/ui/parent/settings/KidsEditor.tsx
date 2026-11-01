import { useState } from 'react'
import { kidSlotKey, PRICES } from '../../../config/pricing'
import { kidLimit } from '../../../engine/entitlements'
import { formatCents } from '../../../engine/money'
import type { Grade, ThemeKey } from '../../../engine/types'
import { activeKids, useActions, useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { useToast } from '../../primitives/Toaster'
import { useParent } from '../useParent'
import { BuddyChoice } from './BuddyChoice'
import { GRADES, KidRow } from './KidRow'
import { moved, useSave } from './fields'

function AddKidForm({ onDone }: { onDone(): void }) {
  const save = useSave()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<Grade>('K')
  const [theme, setTheme] = useState<ThemeKey>('truck')
  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!name.trim()) return
    void save({ type: 'kid.add', kid: { name: name.trim(), grade, theme, chores: [], routineIds: [] } }, `${name.trim()} added`)
      .then((ok) => { if (ok) onDone() })
  }
  return (
    <form className="st-card" onSubmit={submit} aria-label="Add a kid">
      <div className="st-field">
        <label htmlFor="new-kid-name" className="st-label">Name</label>
        <input id="new-kid-name" className="st-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </div>
      <div className="st-field">
        <label htmlFor="new-kid-grade" className="st-label">Grade</label>
        <select id="new-kid-grade" className="st-input" value={grade} onChange={(e) => setGrade(e.target.value as Grade)}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <BuddyChoice label="Buddy for the new kid" value={theme} onPick={setTheme} />
      <div className="st-row">
        <Button type="submit" disabled={!name.trim()}>Add kid</Button>
        <Button variant="quiet" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

export function KidsEditor() {
  const { family } = useStore()
  const { update } = useActions()
  const { require } = useParent()
  const toast = useToast()
  const save = useSave()
  const [adding, setAdding] = useState(false)
  if (!family) return null
  const kids = activeKids(family)
  const archived = family.kids.filter((k) => k.archived).sort((a, b) => a.order - b.order)
  const limit = kidLimit(family)
  const atLimit = Number.isFinite(limit) && kids.length >= limit
  const slots = family.entitlements.filter((e) => e.key.startsWith('kid-slot:')).length
  const price = formatCents(PRICES.extraKid)

  const unlock = (): void => {
    require(() => {
      update({ type: 'entitlement.grant', key: kidSlotKey(slots + 1) })
        .then(() => toast.show('Extra profile unlocked'))
        .catch(() => toast.show('Could not save that. Try again.'))
    })
  }

  return (
    <div className="st-body">
      <ul className="st-rows">
        {kids.map((k, i) => (
          <KidRow
            key={k.id}
            kid={k}
            index={i}
            count={kids.length}
            onMove={(d) => { void save({ type: 'kid.reorder', ids: moved(kids, i, d).map((x) => x.id) }) }}
          />
        ))}
      </ul>

      {adding && !atLimit ? <AddKidForm onDone={() => setAdding(false)} /> : atLimit ? (
        <div className="st-row st-row-wrap">
          <p className="st-hint">The free plan has {limit} kids. One more profile is {price}.</p>
          <Button className="pr-dense" aria-label={`Unlock extra profile, ${price}`} onClick={unlock}>Unlock, {price}</Button>
        </div>
      ) : (
        <Button className="pr-dense" icon="plus" onClick={() => setAdding(true)}>Add kid</Button>
      )}

      {archived.length > 0 ? (
        <>
          <h4 className="pr-sub">Archived</h4>
          <p className="st-hint">History is kept. Unarchive a kid to bring them back.</p>
          <ul className="st-rows">
            {archived.map((k) => (
              <li key={k.id} className="st-row">
                <span className="pr-row-main">{k.name}</span>
                <Button className="pr-dense" variant="quiet" aria-label={`Unarchive ${k.name}`} onClick={() => { void save({ type: 'kid.unarchive', id: k.id }, `${k.name} is back`) }}>Unarchive</Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
