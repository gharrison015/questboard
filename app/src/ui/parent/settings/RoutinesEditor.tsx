import { newId } from '../../../engine/ids'
import type { Routine } from '../../../engine/types'
import { activeKids, useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { ConfirmButton, DayChips, MoveButtons, TextField, moved, useSave } from './fields'

function RoutineCard({ routine }: { routine: Routine }) {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  const kids = activeKids(family)
  const patch = (p: Partial<Routine>): void => { void save({ type: 'routine.update', id: routine.id, patch: p }) }
  const setSteps = (steps: Routine['steps']): void => patch({ steps })
  const toggleKid = (kidId: string, routineIds: string[], on: boolean): void => {
    const next = on ? routineIds.filter((x) => x !== routine.id) : [...routineIds, routine.id]
    void save({ type: 'kid.update', id: kidId, patch: { routineIds: next } })
  }

  return (
    <li className="st-card" aria-label={routine.name}>
      <TextField label="Routine name" value={routine.name} onCommit={(v) => { if (v.trim()) patch({ name: v.trim() }) }} />
      <ol className="st-rows">
        {routine.steps.map((s, i) => (
          <li key={s.id} className="st-row">
            <TextField
              label={`Step ${i + 1} of ${routine.name}`}
              hideLabel
              value={s.label}
              onCommit={(v) => { if (v.trim()) setSteps(routine.steps.map((x) => (x.id === s.id ? { ...x, label: v.trim() } : x))) }}
            />
            <MoveButtons index={i} count={routine.steps.length} what={s.label} onMove={(d) => setSteps(moved(routine.steps, i, d))} />
            <Button className="pr-dense" variant="quiet" aria-label={`Remove step ${s.label}`} onClick={() => setSteps(routine.steps.filter((x) => x.id !== s.id))}>Remove</Button>
          </li>
        ))}
      </ol>
      <Button className="pr-dense" variant="quiet" icon="plus" onClick={() => setSteps([...routine.steps, { id: newId(), label: 'New step' }])}>Add step</Button>
      <DayChips label={`Days for ${routine.name}`} days={routine.days} onChange={(days) => patch({ days })} />
      <div className="st-chips" role="group" aria-label={`Kids doing ${routine.name}`}>
        {kids.map((k) => {
          const on = k.routineIds.includes(routine.id)
          return (
            <button key={k.id} type="button" className="st-chip" aria-pressed={on} onClick={() => toggleKid(k.id, k.routineIds, on)}>{k.name}</button>
          )
        })}
      </div>
      <ConfirmButton
        label="Delete routine"
        confirmLabel="Confirm delete"
        ariaLabel={routine.name}
        onConfirm={() => { void save({ type: 'routine.remove', id: routine.id }) }}
      />
    </li>
  )
}

export function RoutinesEditor() {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  return (
    <div className="st-body">
      <p className="st-hint">Routines are checklists with no money. Pick the days and the kids who do each one.</p>
      <ul className="st-rows">
        {family.routines.map((r) => <RoutineCard key={r.id} routine={r} />)}
      </ul>
      <Button
        className="pr-dense"
        icon="plus"
        onClick={() => { void save({ type: 'routine.add', routine: { name: 'New routine', steps: [], days: [0, 1, 2, 3, 4, 5, 6] } }) }}
      >
        Add routine
      </Button>
    </div>
  )
}
