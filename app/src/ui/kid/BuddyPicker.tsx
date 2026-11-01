import { useRef } from 'react'
import { THEMES, THEME_ORDER } from '../../config/themes'
import { ownsTheme } from '../../engine/entitlements'
import type { Kid, ThemeKey } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'

interface BuddyPickerProps {
  kid: Kid
  /** Makes the hero buddy hop after a pick. */
  onPicked?: () => void
}

export function BuddyPicker({ kid, onPicked }: BuddyPickerProps) {
  const { family } = useStore()
  const { update } = useActions()
  const toast = useToast()
  const busy = useRef(false)
  if (!family) return null
  const owned = THEME_ORDER.filter((key) => ownsTheme(family, key))

  const pick = (key: ThemeKey): void => {
    if (busy.current || key === kid.theme) return
    busy.current = true
    update({ type: 'kid.update', id: kid.id, patch: { theme: key } })
      .then(() => {
        toast.show(`${kid.name} is now a ${THEMES[key].name}`)
        onPicked?.()
      })
      .catch(() => toast.show('Could not change the buddy. Try again.'))
      .finally(() => { busy.current = false })
  }

  return (
    <section className="qb-card kb-badgecard" aria-label="Your buddies">
      <SectionHead icon="family" title="Your buddies" meta={`${owned.length}`} />
      <ul className="kb-buddies">
        {owned.map((key) => {
          const t = THEMES[key]
          const using = key === kid.theme
          return (
            <li key={key}>
              <button
                type="button"
                className="kb-buddytile"
                aria-pressed={using}
                aria-label={using ? `${t.name}, using` : t.name}
                onClick={() => pick(key)}
              >
                <img className="kb-buddytile-img" src={`${import.meta.env.BASE_URL}buddies/${t.img}`} alt="" draggable={false} />
                <span className="kb-buddytile-name">{t.name}</span>
                {using ? <span className="kb-buddytile-tag">Using</span> : null}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="kb-teach">More buddies are in the parent Shop.</p>
    </section>
  )
}
