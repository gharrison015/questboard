import { THEMES, THEME_ORDER } from '../../../config/themes'
import { ownsTheme } from '../../../engine/entitlements'
import type { ThemeKey } from '../../../engine/types'
import { useStore } from '../../../state/store'

/** Owned buddies only. Locked ones are bought in the Shop. */
export function BuddyChoice({ value, onPick, label }: { value: ThemeKey; onPick(k: ThemeKey): void; label: string }) {
  const { family } = useStore()
  if (!family) return null
  const owned = THEME_ORDER.filter((k) => ownsTheme(family, k))
  return (
    <div>
      <div className="st-chips" role="group" aria-label={label}>
        {owned.map((k) => (
          <button key={k} type="button" className="st-chip" aria-pressed={value === k} onClick={() => onPick(k)}>{THEMES[k].name}</button>
        ))}
      </div>
      {owned.length < THEME_ORDER.length ? <p className="st-hint">More buddies are in the Shop.</p> : null}
    </div>
  )
}
