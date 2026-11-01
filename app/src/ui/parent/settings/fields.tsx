import { useId, useRef, useState, type ReactNode } from 'react'
import { LimitError, type FamilyAction } from '../../../engine/reducer'
import { formatCents, parseDollars } from '../../../engine/money'
import { useActions } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { useToast } from '../../primitives/Toaster'

/** Runs a family action, toasts "Saved", and turns a LimitError into a plain message. Resolves true on success. */
export function useSave(): (action: FamilyAction, message?: string) => Promise<boolean> {
  const { update } = useActions()
  const toast = useToast()
  return async (action, message = 'Saved') => {
    try {
      await update(action)
      toast.show(message)
      return true
    } catch (err) {
      if (err instanceof LimitError) {
        toast.show(err.limit === 'chores' ? 'That is more active chores than the free limit allows.' : 'That limit has been reached.')
      } else {
        toast.show('Could not save that. Try again.')
      }
      return false
    }
  }
}

/** "$.5" and ".5" become "0.5", "1." becomes "1.0", so common typing shortcuts parse. */
export function normalizeMoneyText(raw: string): string {
  let s = raw.trim().replace(/^\$/, '').trim()
  if (s.startsWith('.')) s = `0${s}`
  if (s.endsWith('.')) s = `${s}0`
  return s
}

interface MoneyInputProps {
  label: string
  /** Cents. Null shows an empty box when allowBlank is set. */
  value: number | null
  onCommit(cents: number | null): void
  allowBlank?: boolean
  hideLabel?: boolean
  hint?: string
}

/** Text box that parses dollars on blur. A bad entry shows a message and keeps the previous value. */
export function MoneyInput({ label, value, onCommit, allowBlank = false, hideLabel = false, hint }: MoneyInputProps) {
  const id = useId()
  const [error, setError] = useState('')
  const shown = value === null ? '' : formatCents(value)
  const onBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    const el = e.currentTarget
    const raw = el.value.trim()
    if (raw === '' && allowBlank) {
      setError('')
      if (value !== null) onCommit(null)
      return
    }
    const cents = raw === '' ? null : parseDollars(normalizeMoneyText(raw))
    if (cents === null) {
      setError('Enter an amount like 1.50 or 0.25.')
      el.value = shown
      return
    }
    setError('')
    el.value = formatCents(cents)
    if (cents !== value) onCommit(cents)
  }
  return (
    <div className="st-field">
      <label htmlFor={id} className={hideLabel ? 'st-sr' : 'st-label'}>{label}</label>
      <input
        key={shown}
        id={id}
        className="st-input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={shown}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        onChange={() => { if (error) setError('') }}
        onBlur={onBlur}
      />
      {hint && !error ? <p className="st-hint">{hint}</p> : null}
      {error ? <p id={`${id}-err`} className="st-error" role="alert">{error}</p> : null}
    </div>
  )
}

interface TextFieldProps {
  label: string
  value: string
  onCommit(v: string): void
  hideLabel?: boolean
  maxChars?: number
  className?: string
  placeholder?: string
  /** Applied to the typed text before it is compared and saved. */
  normalize?(v: string): string
}

/** Text box that saves on blur. It remounts when the stored value changes, so outside edits show up. */
export function TextField({ label, value, onCommit, hideLabel = false, maxChars, className, placeholder, normalize }: TextFieldProps) {
  const id = useId()
  const onBlur = (e: React.FocusEvent<HTMLInputElement>): void => {
    let v = e.currentTarget.value
    if (maxChars) v = Array.from(v).slice(0, maxChars).join('')
    if (normalize) v = normalize(v)
    e.currentTarget.value = v
    if (v !== value) onCommit(v)
  }
  return (
    <div className="st-field">
      <label htmlFor={id} className={hideLabel ? 'st-sr' : 'st-label'}>{label}</label>
      <input
        key={value}
        id={id}
        className={['st-input', className].filter(Boolean).join(' ')}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        defaultValue={value}
        onBlur={onBlur}
      />
    </div>
  )
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Seven toggle chips, Sunday first. */
export function DayChips({ days, onChange, label }: { days: number[]; onChange(next: number[]): void; label: string }) {
  return (
    <div className="st-days" role="group" aria-label={label}>
      {DAY_NAMES.map((name, i) => {
        const on = days.includes(i)
        return (
          <button
            key={name}
            type="button"
            className="st-day"
            aria-pressed={on}
            aria-label={name}
            onClick={() => onChange(on ? days.filter((d) => d !== i) : [...days, i].sort((a, b) => a - b))}
          >
            {DAY_LETTERS[i]}
          </button>
        )
      })}
    </div>
  )
}

/** A button that asks twice: the first tap changes it to the confirm label. */
export function ConfirmButton({ label, confirmLabel, onConfirm, ariaLabel }: {
  label: string
  confirmLabel: string
  onConfirm(): void
  ariaLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<number>(0)
  const arm = (): void => {
    setArmed(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setArmed(false), 4000)
  }
  return armed ? (
    <Button className="pr-dense" variant="danger" aria-label={ariaLabel ? `${confirmLabel} ${ariaLabel}` : confirmLabel} onClick={() => { setArmed(false); onConfirm() }}>
      {confirmLabel}
    </Button>
  ) : (
    <Button className="pr-dense" variant="quiet" icon="trash" aria-label={ariaLabel ? `${label} ${ariaLabel}` : label} onClick={arm}>
      {label}
    </Button>
  )
}

/** Move up and move down buttons for a list row. */
export function MoveButtons({ index, count, onMove, what }: { index: number; count: number; onMove(delta: -1 | 1): void; what: string }) {
  return (
    <span className="st-move">
      <Button className="pr-dense" variant="quiet" aria-label={`Move ${what} up`} disabled={index === 0} onClick={() => onMove(-1)}>Up</Button>
      <Button className="pr-dense" variant="quiet" aria-label={`Move ${what} down`} disabled={index === count - 1} onClick={() => onMove(1)}>Down</Button>
    </span>
  )
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="st-hint">{children}</p>
}

/** Moves item at index by delta, returning a new array. */
export function moved<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const to = index + delta
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}
