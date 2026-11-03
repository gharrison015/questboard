import type { DeviceSettings } from '../storage/adapter'
import { labFold } from './lab'

export type Mode = 'phone' | 'tablet' | 'tv'

export interface ModeInput {
  width: number
  coarse: boolean
  hash: string
  override: DeviceSettings['modeOverride']
}

const PHONE_MAX = 700
const TV_MIN = 1280

/** The width and pointer rules on their own, with no hash or override. */
function byViewport(width: number, coarse: boolean): Mode {
  if (width < PHONE_MAX) return 'phone'
  if (width < TV_MIN || coarse) return 'tablet'
  return 'tv'
}

/**
 * Spec section 5. `#tv` always wins. `#parent` forces a controllable layout, so a wide
 * screen with no touch falls back to tablet instead of the read-only TV board.
 * After the hash comes the device override, then the viewport rules.
 */
export function detectMode(input: ModeInput): Mode {
  if (input.hash === '#tv') return 'tv'
  const viaRules = input.override !== 'auto' ? input.override : byViewport(input.width, input.coarse)
  if (input.hash === '#parent' && viaRules === 'tv') return 'tablet'
  return viaRules
}

/** True on a dual-screen fold device. False where the media feature is unsupported. */
export function isFold(): boolean {
  if (typeof window === 'undefined') return false
  if (labFold()) return true
  if (typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(horizontal-viewport-segments: 2)').matches
  } catch {
    return false
  }
}
