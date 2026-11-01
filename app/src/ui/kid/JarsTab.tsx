import { useEffect, useMemo, useRef, useState } from 'react'
import { currentWeekStart } from '../../engine/closeWeeks'
import { addDays, dayFull } from '../../engine/dates'
import { newId } from '../../engine/ids'
import { allocationStep, canAllocate } from '../../engine/jars'
import { formatCents } from '../../engine/money'
import type { JarKey, Kid, QBEvent } from '../../engine/types'
import { useJars } from '../../state/selectors'
import { activeKids, useActions, useStore } from '../../state/store'
import { Icon } from '../primitives/Icon'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { Coin } from './Coin'

/** Sub-dollar amounts read as cents (25¢), everything else as dollars. */
const amt = (c: number): string => (c < 100 ? `${c}¢` : formatCents(c))

const MAX_COINS = 40
const BAR_FLOOR = 5000
const JARS: { key: JarKey; label: string }[] = [
  { key: 'save', label: 'Save' },
  { key: 'spend', label: 'Spend' },
  { key: 'give', label: 'Give' },
]

/** The target for Give: the kid's charity, or a sibling by id. */
type Target = { kind: 'charity' } | { kind: 'kid'; id: string }

export function JarsTab({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const j = useJars(kid)
  const [target, setTarget] = useState<Target | null>(null)
  const [drops, setDrops] = useState<Record<JarKey, number>>({ save: 0, spend: 0, give: 0 })

  // Amounts appended but not yet in `events`, so a fast second tap sees the reduced remainder.
  const pending = useRef(new Map<string, number>())
  useEffect(() => {
    const ids = new Set(events.map((e) => e.id))
    for (const id of pending.current.keys()) if (ids.has(id)) pending.current.delete(id)
  }, [events])

  const siblings = useMemo(() => activeKids(family).filter((k) => k.id !== kid.id), [family, kid.id])
  if (!family) return null

  const charity = kid.charity?.name
  const chosen: Target | null =
    target && (target.kind === 'charity' ? !!charity : siblings.some((s) => s.id === target.id))
      ? target
      : charity ? { kind: 'charity' } : siblings[0] ? { kind: 'kid', id: siblings[0].id } : null
  const sibling = chosen?.kind === 'kid' ? siblings.find((s) => s.id === chosen.id) : undefined
  const targetName = sibling ? sibling.name : charity ?? ''

  const inflight = (): number => {
    const seen = new Set(events.map((e) => e.id))
    let n = 0
    for (const [id, amt] of pending.current) if (!seen.has(id)) n += amt
    return n
  }
  const remaining = (): number => Math.max(0, j.unsplit - inflight())

  const act = (jar: JarKey, want: number | 'all'): void => {
    const left = remaining()
    const amount = want === 'all' ? left : want
    if (!canAllocate({ ...j, unsplit: left }, amount)) return
    if (jar === 'give' && !chosen) return
    const at = new Date().toISOString()
    const groupId = jar === 'give' && sibling ? newId() : undefined
    const alloc: QBEvent = { id: newId(), at, type: 'jar.allocated', kidId: kid.id, jar, amount, ...(groupId ? { groupId } : {}) }
    const out: QBEvent[] = [alloc]
    let text: string
    if (jar === 'give' && sibling) {
      // The coins pass through the Give jar, so the gift always draws on money that was split.
      out.push({ id: newId(), at, type: 'jar.gifted', fromKidId: kid.id, toKidId: sibling.id, amount, groupId: groupId as string })
    }
    if (jar === 'save') text = `Saved ${amt(amount)}`
    else if (jar === 'spend') text = `Spending ${amt(amount)}`
    else text = `Giving ${amt(amount)} to ${targetName}`
    pending.current.set(alloc.id, amount)
    append(out)
      .then(() => {
        toast.show(text)
        setDrops((d) => ({ ...d, [jar]: d[jar] + 1 }))
      })
      .catch(() => {
        pending.current.delete(alloc.id)
        toast.show('Could not save that. Try again.')
        setDrops((d) => ({ ...d }))
      })
  }

  const left = remaining()
  const step = allocationStep({ ...j, unsplit: left })
  const shown = Math.min(MAX_COINS, Math.floor(left / 100))
  const extra = Math.floor(left / 100) - shown
  const nextPay = dayFull(addDays(currentWeekStart(family, now), 7))

  return (
    <div className="kb-tab">
      <section className="kb-section" aria-label="Coins to split">
        <SectionHead icon="coin" title="Coins to split" meta={`${formatCents(left)} left`} />
        {left <= 0 ? (
          <p className="kb-empty">No coins to split yet. Payday is {nextPay}.</p>
        ) : (
          <div className="kb-pot" role="img" aria-label={`${formatCents(left)} to split`}>
            {Array.from({ length: shown }, (_, i) => <Coin key={i} />)}
            {extra > 0 ? <span className="kb-pot-more">+{extra}</span> : null}
          </div>
        )}
      </section>
      <div className="kb-jarcards">
        {JARS.map(({ key, label }) => {
          const total = j[key]
          const pct = Math.min(100, Math.round((total / Math.max(total, BAR_FLOOR)) * 100))
          const buttons: { text: string; amount: number | 'all' }[] = [
            { text: `+${amt(step)}`, amount: step },
            { text: `+${amt(step * 5)}`, amount: step * 5 },
            { text: 'All', amount: 'all' },
          ]
          return (
            <section key={key} role="group" aria-label={label} className={`kb-jarcard kb-jar-${key}`}>
              <div className="kb-jarcard-head">
                <span className="kb-jarcard-ico"><Icon name={key} size={28} /></span>
                <h3 className="kb-jarcard-name">{label}</h3>
                <span key={drops[key]} className="kb-jarcard-drop" data-run={drops[key] > 0 ? 'true' : undefined} aria-hidden="true"><Coin size={18} /></span>
              </div>
              <p className="kb-jarcard-total">{formatCents(total)}</p>
              <div className="kb-jarbar" aria-hidden="true"><div className="kb-jarbar-fill" style={{ width: `${pct}%` }} /></div>
              {key === 'give' ? (
                <div className="kb-targets" role="radiogroup" aria-label="Give to">
                  {charity ? (
                    <TargetBtn label={charity} on={chosen?.kind === 'charity'} onPick={() => setTarget({ kind: 'charity' })} />
                  ) : null}
                  {siblings.map((s) => (
                    <TargetBtn key={s.id} label={s.name} on={chosen?.kind === 'kid' && chosen.id === s.id} onPick={() => setTarget({ kind: 'kid', id: s.id })} />
                  ))}
                </div>
              ) : null}
              <div className="kb-jarbtns">
                {buttons.map((b) => {
                  const want = b.amount === 'all' ? left : b.amount
                  const ok = canAllocate({ ...j, unsplit: left }, want) && (key !== 'give' || !!chosen)
                  return (
                    <button
                      key={b.text}
                      type="button"
                      className="kb-jarbtn"
                      aria-disabled={ok ? undefined : 'true'}
                      onClick={ok ? () => act(key, b.amount) : undefined}
                    >
                      {b.text}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
      <p className="kb-teach">You decide how much to save, spend and share.</p>
    </div>
  )
}

function TargetBtn({ label, on, onPick }: { label: string; on: boolean; onPick(): void }) {
  return (
    <button type="button" role="radio" aria-checked={on} className="kb-target" onClick={onPick}>
      {label}
    </button>
  )
}
