import { useRef } from 'react'
import { FREE_THEMES } from '../../../config/limits'
import { THEMES } from '../../../config/themes'
import type { Grade } from '../../../engine/types'
import { Button } from '../../primitives/Button'
import { useToast } from '../../primitives/Toaster'
import { GRADES } from '../../parent/settings/KidRow'
import { resizePhoto } from '../../parent/settings/photo'
import { blankKid, MAX_KIDS, type KidDraft } from '../state'
import type { StepProps } from './types'

function KidCard({ kid, index, canRemove, onChange, onRemove }: {
  kid: KidDraft
  index: number
  canRemove: boolean
  onChange(patch: Partial<KidDraft>): void
  onRemove(): void
}) {
  const file = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const n = index + 1
  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    resizePhoto(f).then((photo) => onChange({ photo })).catch((err: unknown) => toast.show(err instanceof Error ? err.message : 'Could not read that photo.'))
  }
  return (
    <section className="st-card su-kid" aria-label={`Kid ${n}`}>
      <div className="st-field">
        <label htmlFor={`su-kid-name-${kid.key}`} className="st-label">Name of kid {n}</label>
        <input id={`su-kid-name-${kid.key}`} className="st-input" value={kid.name} maxLength={30} autoComplete="off" onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="st-field">
        <label htmlFor={`su-kid-grade-${kid.key}`} className="st-label">Grade for kid {n}</label>
        <select id={`su-kid-grade-${kid.key}`} className="st-input" value={kid.grade} onChange={(e) => onChange({ grade: e.target.value as Grade })}>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="st-chips" role="group" aria-label={`Buddy for kid ${n}`}>
        {FREE_THEMES.map((t) => (
          <button key={t} type="button" className="st-chip" aria-pressed={kid.theme === t} onClick={() => onChange({ theme: t })}>{THEMES[t].name}</button>
        ))}
      </div>
      <div className="st-row st-row-wrap">
        {kid.photo ? <img className="st-photo" src={kid.photo} alt="" width={48} height={48} /> : null}
        <input ref={file} type="file" accept="image/*" capture="user" className="st-sr" aria-label={`Photo for kid ${n}`} onChange={onFile} />
        <Button variant="quiet" icon="photo" onClick={() => file.current?.click()}>{kid.photo ? 'Change photo' : 'Add a photo (optional)'}</Button>
        {kid.photo ? <Button variant="quiet" onClick={() => onChange({ photo: undefined })}>Remove photo</Button> : null}
        {canRemove ? <Button variant="quiet" aria-label={`Remove kid ${n}`} onClick={onRemove}>Remove</Button> : null}
      </div>
    </section>
  )
}

export function KidsStep({ state, set }: StepProps) {
  const { kids } = state
  const atLimit = kids.length >= MAX_KIDS
  const change = (key: number, patch: Partial<KidDraft>): void => set({ kids: kids.map((k) => (k.key === key ? { ...k, ...patch } : k)) })
  return (
    <>
      <h2 className="su-title">Who is playing?</h2>
      <p className="su-lead">Add each kid and pick a buddy. A photo is optional.</p>
      {kids.map((k, i) => (
        <KidCard key={k.key} kid={k} index={i} canRemove={kids.length > 1} onChange={(p) => change(k.key, p)} onRemove={() => set({ kids: kids.filter((x) => x.key !== k.key) })} />
      ))}
      {atLimit ? (
        <p className="st-hint">Two kids are free. More are available in the Shop after setup.</p>
      ) : (
        <Button variant="quiet" icon="plus" onClick={() => set({ kids: [...kids, blankKid(kids.map((k) => k.theme))] })}>Add another kid</Button>
      )}
    </>
  )
}
