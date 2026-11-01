import { FREE_LIMITS, FREE_THEMES } from '../config/limits'
import { CHORES_UNLIMITED_KEY, PRO_KEY, packKey, themeKey } from '../config/pricing'
import type { Family, ThemeKey } from './types'

const has = (f: Family, key: string): boolean => f.entitlements.some((e) => e.key === key)

export const hasPro = (f: Family): boolean => has(f, PRO_KEY)

export function kidLimit(f: Family): number {
  if (hasPro(f)) return Infinity
  const slots = f.entitlements.filter((e) => e.key.startsWith('kid-slot:')).length
  return FREE_LIMITS.kids + slots
}

export function choreLimit(f: Family, _kidId: string): number {
  return hasPro(f) || has(f, CHORES_UNLIMITED_KEY) ? Infinity : FREE_LIMITS.choresPerKid
}

export const ownsTheme = (f: Family, key: ThemeKey): boolean =>
  FREE_THEMES.includes(key) || hasPro(f) || has(f, themeKey(key))

export const ownsPack = (f: Family, id: string): boolean => hasPro(f) || has(f, packKey(id))
