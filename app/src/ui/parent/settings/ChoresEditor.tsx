import { useState } from 'react'
import { CHORE_ICON_NAMES } from '../../../content/choreIcons'
import { CHORES_UNLIMITED_KEY, PRICES } from '../../../config/pricing'
import { choreLimit } from '../../../engine/entitlements'
import { formatCents } from '../../../engine/money'
import type { Chore } from '../../../engine/types'
import { useActions, useStore } from '../../../state/store'
import { ChoreIcon } from '../../kid/ChoreIcon'
import { Button } from '../../primitives/Button'
import { useToast } from '../../primitives/Toaster'
import { useParent } from '../useParent'
import { ConfirmButton, DayChips, MoneyInput, TextField, useSave } from './fields'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function ChoreRow({ kidId, chore }: { kidId: string; chore: Chore }) {
  const save = useSave()
  const [picking, setPicking] = useState(false)
  const patch = (p: Partial<Chore>): void => { void save({ type: 'chore.update', kidId, id: chore.id, patch: p }) }
  return (
    <li className="st-card" aria-label={chore.label}>
      <div className="st-row st-row-wrap">
        <label className="st-check">
          <input type="checkbox" checked={chore.active} aria-label={`Active: ${chore.label}`} onChange={(e) => patch({ active: e.target.checked })} />
          <span>Active</span>
        </label>
        <TextField label={`Name of ${chore.label}`} hideLabel value={chore.label} onCommit={(v) => { if (v.trim()) patch({ label: v.trim() }) }} />
        <Button className="pr-dense" variant="quiet" aria-expanded={picking} aria-label={`Icon for ${chore.label}`} onClick={() => setPicking(!picking)}>
          <ChoreIcon name={chore.icon} size={24} />
        </Button>
      </div>
      {picking ? (
        <div className="st-icons" role="group" aria-label={`Pick an icon for ${chore.label}`}>
          {CHORE_ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              className="st-icon"
              aria-label={n}
              aria-pressed={chore.icon === n}
              onClick={() => { patch({ icon: n }); setPicking(false) }}
            >
              <ChoreIcon name={n} size={24} />
            </button>
          ))}
        </div>
      ) : null}
      <DayChips label={`Days for ${chore.label}`} days={chore.days} onChange={(days) => patch({ days })} />
      <div className="st-row st-row-wrap">
        <MoneyInput label={`Pay for ${chore.label}`} hint="$0 means expected, no pay." value={chore.pay} onCommit={(c) => patch({ pay: c ?? 0 })} />
        <ConfirmButton label="Delete" confirmLabel="Confirm delete" ariaLabel={chore.label} onConfirm={() => { void save({ type: 'chore.remove', kidId, id: chore.id }) }} />
      </div>
    </li>
  )
}

/** Chores for one kid. At the free limit, adding shows the price and an Unlock button instead of saving. */
export function ChoresEditor({ kidId }: { kidId: string }) {
  const { family } = useStore()
  const { update } = useActions()
  const { require } = useParent()
  const toast = useToast()
  const save = useSave()
  const [blocked, setBlocked] = useState(false)
  const kid = family?.kids.find((k) => k.id === kidId)
  if (!family || !kid) return null

  const limit = choreLimit(family, kidId)
  const active = kid.chores.filter((c) => c.active).length
  const atLimit = Number.isFinite(limit) && active >= limit
  const price = formatCents(PRICES.unlimitedChores)

  const unlock = (): void => {
    require(() => {
      update({ type: 'entitlement.grant', key: CHORES_UNLIMITED_KEY })
        .then(() => { setBlocked(false); toast.show('Unlimited chores unlocked') })
        .catch(() => toast.show('Could not save that. Try again.'))
    })
  }
  const add = (): void => {
    if (atLimit) { setBlocked(true); return }
    void save({ type: 'chore.add', kidId, chore: { label: 'New chore', icon: 'star', days: ALL_DAYS, pay: family.money.chorePayDefault, active: true } })
  }

  return (
    <div className="st-body">
      <div className="st-row st-row-wrap">
        <p className="st-count">{Number.isFinite(limit) ? `${active} of ${limit} active` : `${active} active, no limit`}</p>
        {atLimit ? <Button className="pr-dense" aria-label={`Unlock unlimited chores, ${price}`} onClick={unlock}>Unlock unlimited chores, {price}</Button> : null}
      </div>
      {blocked && atLimit ? (
        <p className="pr-note" role="status"><span>{kid.name} is at the free limit of {limit} active chores. Unlock unlimited chores for {price}, or switch one off first.</span></p>
      ) : null}
      <ul className="st-rows">
        {kid.chores.map((c) => <ChoreRow key={c.id} kidId={kidId} chore={c} />)}
      </ul>
      <Button className="pr-dense" icon="plus" onClick={add}>Add chore</Button>
    </div>
  )
}
