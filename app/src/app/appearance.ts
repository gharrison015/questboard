import type { Appearance } from '../engine/types'
import type { Mode } from './mode'

export type ResolvedAppearance = 'bright' | 'calm' | 'dark'

/** Dark from 19:00 to 07:00 local time. */
function isNight(now: Date): boolean {
  const h = now.getHours()
  return h >= 19 || h < 7
}

/** The device override wins, then the family setting. `auto` is dark at night on TV and bright elsewhere. */
export function resolveAppearance(
  family: Appearance,
  device: Appearance | null,
  mode: Mode,
  now: Date,
): ResolvedAppearance {
  const pick = device !== null && device !== 'auto' ? device : family
  if (pick !== 'auto') return pick
  return mode === 'tv' && isNight(now) ? 'dark' : 'bright'
}
