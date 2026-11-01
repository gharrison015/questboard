import { newId } from '../../../engine/ids'
import type { Reason } from '../../../engine/types'
import { useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { ConfirmButton, MoneyInput, MoveButtons, TextField, moved, useSave } from './fields'

export function ReasonsEditor() {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  const list = family.reasons
  const write = (reasons: Reason[]): void => { void save({ type: 'reason.set', reasons }) }
  const edit = (id: string, patch: Partial<Reason>): void => write(list.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <div className="st-body">
      <p className="st-hint">These are the buttons in Log a deduction. Leave the amount blank to use the default of your money settings.</p>
      <ul className="st-rows">
        {list.map((r, i) => (
          <li key={r.id} className="st-row st-row-wrap">
            <TextField label={`Emoji for ${r.label}`} hideLabel value={r.emoji} maxChars={2} required className="st-emoji" onCommit={(v) => edit(r.id, { emoji: v })} />
            <TextField label={`Reason ${i + 1} name`} hideLabel required value={r.label} onCommit={(v) => { if (v.trim()) edit(r.id, { label: v.trim() }) }} />
            <MoneyInput
              label={`Amount for ${r.label}`}
              hideLabel
              allowBlank
              value={r.amount ?? null}
              onCommit={(c) => {
                const { amount: _drop, ...rest } = r
                write(list.map((x) => (x.id === r.id ? (c === null ? rest : { ...rest, amount: c }) : x)))
              }}
            />
            <MoveButtons index={i} count={list.length} what={r.label} onMove={(d) => write(moved(list, i, d))} />
            <ConfirmButton label="Delete" confirmLabel="Confirm delete" ariaLabel={r.label} onConfirm={() => write(list.filter((x) => x.id !== r.id))} />
          </li>
        ))}
      </ul>
      <Button className="pr-dense" icon="plus" onClick={() => write([...list, { id: newId(), label: 'New reason', emoji: '❗' }])}>Add reason</Button>
    </div>
  )
}
