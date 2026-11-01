import { PACKS } from '../../config/packs'
import { PRICES, CHORES_UNLIMITED_KEY, PRO_KEY, kidSlotKey, packKey, themeKey } from '../../config/pricing'
import { THEMES, THEME_ORDER } from '../../config/themes'
import { hasPro, ownsPack, ownsTheme } from '../../engine/entitlements'
import { LimitError } from '../../engine/reducer'
import { formatCents } from '../../engine/money'
import type { Kid } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { Button } from '../primitives/Button'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { useParent } from './useParent'

/** Themes, sticker packs and plans. Preview pricing: a buy records the entitlement, nothing is charged. */
export function Shop({ kid }: { kid: Kid }) {
  const { family } = useStore()
  const { update } = useActions()
  const { require } = useParent()
  const toast = useToast()
  if (!family) return null
  const pro = hasPro(family)
  const owns = (key: string): boolean => family.entitlements.some((e) => e.key === key)

  const buy = (key: string, what: string): void => {
    require(() => {
      update({ type: 'entitlement.grant', key })
        .then(() => toast.show(`${what} unlocked`))
        .catch((err: unknown) => toast.show(err instanceof LimitError ? 'That limit has been reached.' : 'Could not save that. Try again.'))
    })
  }

  const slots = family.entitlements.filter((e) => e.key.startsWith('kid-slot:')).length
  const plans: { key: string; name: string; note: string; price: string; owned: boolean }[] = [
    { key: kidSlotKey(slots + 1), name: 'Extra profile', note: 'One more kid', price: formatCents(PRICES.extraKid), owned: pro },
    { key: CHORES_UNLIMITED_KEY, name: 'Unlimited chores', note: 'No limit per kid', price: formatCents(PRICES.unlimitedChores), owned: pro || owns(CHORES_UNLIMITED_KEY) },
  ]

  return (
    <section className="pr-section" aria-label="Shop">
      <SectionHead icon="shop" title="Shop" />
      <p className="pr-banner" role="note">Preview pricing. Nothing is charged yet.</p>

      <h4 className="pr-sub">Buddies</h4>
      <div className="pr-grid">
        {THEME_ORDER.map((key) => {
          const t = THEMES[key]
          const owned = ownsTheme(family, key)
          const using = kid.theme === key
          return (
            <div key={key} className="pr-tile" data-state={using ? 'using' : owned ? 'owned' : 'locked'}>
              <div className="pr-artbox">
                <img
                  className="pr-art"
                  style={{ objectFit: 'contain' }}
                  src={`${import.meta.env.BASE_URL}buddies/${t.img}`}
                  alt=""
                  draggable={false}
                />
              </div>
              <p className="pr-tile-name">{t.name}</p>
              {using ? <p className="pr-tile-state">Using</p>
                : owned ? <p className="pr-tile-state">Owned</p>
                : t.tier === 'pro' ? <p className="pr-tile-state">With Pro</p>
                : (
                  <Button className="pr-dense" aria-label={`Buy ${t.name}`} onClick={() => buy(themeKey(key), t.name)}>
                    {formatCents(PRICES.theme)}
                  </Button>
                )}
            </div>
          )
        })}
      </div>

      <h4 className="pr-sub">Sticker packs</h4>
      <div className="pr-grid">
        {PACKS.map((p) => {
          const owned = ownsPack(family, p.id)
          return (
            <div key={p.id} className="pr-tile" data-state={owned ? 'owned' : 'locked'}>
              <p className="pr-stickers" aria-hidden="true">{p.items.join(' ')}</p>
              <p className="pr-tile-name">{p.name}</p>
              {owned ? <p className="pr-tile-state">Owned</p> : (
                <Button className="pr-dense" aria-label={`Buy ${p.name} pack`} onClick={() => buy(packKey(p.id), `${p.name} pack`)}>
                  {formatCents(p.price)}
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <h4 className="pr-sub">Plans</h4>
      <ul className="pr-list">
        {plans.map((p) => (
          <li key={p.name} className="pr-row">
            <span className="pr-row-text">
              <span className="pr-row-main">{p.name}</span>
              <span className="pr-row-sub">{p.note}</span>
            </span>
            {p.owned ? <span className="pr-tile-state">Owned</span> : (
              <Button className="pr-dense" aria-label={`Buy ${p.name}`} onClick={() => buy(p.key, p.name)}>{p.price}</Button>
            )}
          </li>
        ))}
        <li className="pr-row pr-pro">
          <span className="pr-row-text">
            <span className="pr-row-main">Family Pro</span>
            <span className="pr-row-sub">Everything unlocked, {formatCents(PRICES.proMonthly)} a month</span>
          </span>
          {pro ? <span className="pr-tile-state">Active</span> : (
            <Button className="pr-dense" aria-label="Buy Family Pro" onClick={() => buy(PRO_KEY, 'Family Pro')}>{formatCents(PRICES.proMonthly)}</Button>
          )}
        </li>
      </ul>
    </section>
  )
}
