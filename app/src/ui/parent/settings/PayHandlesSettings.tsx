import type { PayHandles } from '../../../engine/types'
import { useStore } from '../../../state/store'
import { TextField, useSave } from './fields'

const CLEAN = (v: string): string => v.replace(/\s+/g, '').replace(/^[@$]+/, '')

const ROWS: { key: keyof PayHandles; name: string; hint: string; link: (h: string) => string }[] = [
  { key: 'paypal', name: 'PayPal.me', hint: 'The part after paypal.me/', link: (h) => `paypal.me/${h}` },
  { key: 'cashapp', name: 'Cash App', hint: 'Your cashtag, without the $', link: (h) => `cash.app/$${h}` },
  { key: 'venmo', name: 'Venmo', hint: 'Your username, without the @', link: (h) => `venmo.com/${h}` },
]

export function PayHandlesSettings() {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  const handles = family.payHandles ?? {}
  return (
    <div className="st-body">
      <p className="st-hint">Used for the payout links on payday. The app never sends money itself.</p>
      {ROWS.map((r) => {
        const v = handles[r.key] ?? ''
        return (
          <div key={r.key}>
            <TextField
              label={r.name}
              value={v}
              placeholder={r.hint}
              normalize={CLEAN}
              onCommit={(raw) => {
                const next: PayHandles = { ...handles, [r.key]: raw }
                void save({ type: 'payHandles.set', handles: next })
              }}
            />
            {v ? <p className="st-hint">Link: {r.link(v)}</p> : <p className="st-hint">{r.hint}</p>}
          </div>
        )
      })}
    </div>
  )
}
