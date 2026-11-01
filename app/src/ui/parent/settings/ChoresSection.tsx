import { useState } from 'react'
import { useKid, useKids } from '../../../state/store'
import { ChoresEditor } from './ChoresEditor'

/** Kid chip row above the chores editor. Starts on the kid selected in the app. */
export function ChoresSection() {
  const kids = useKids()
  const current = useKid()
  const [picked, setPicked] = useState<string | null>(null)
  const kidId = kids.find((k) => k.id === picked)?.id ?? current?.id
  if (!kidId) return <p className="st-hint">Add a kid first.</p>
  return (
    <div className="st-body">
      <div className="st-chips" role="group" aria-label="Chores for">
        {kids.map((k) => (
          <button key={k.id} type="button" className="st-chip" aria-pressed={k.id === kidId} aria-label={`Chores for ${k.name}`} onClick={() => setPicked(k.id)}>
            {k.name}
          </button>
        ))}
      </div>
      <ChoresEditor key={kidId} kidId={kidId} />
    </div>
  )
}
