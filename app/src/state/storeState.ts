import type { Family, QBEvent } from '../engine/types'
import type { LockoutState } from '../security/session'
import type { DeviceSettings } from '../storage/adapter'

export type View = 'kid' | 'parent'

export interface StoreState {
  loaded: boolean
  family: Family | null
  events: QBEvent[]
  device: DeviceSettings
  lockout: LockoutState
  currentKidId: string | null
  parentUnlockedAt: number | null
  view: View
  now: Date
}

export type StorePatch = Partial<StoreState>

/**
 * Every change is a patch. Actions persist through the adapter first, then merge the patch,
 * so state never runs ahead of storage.
 */
export function storeReducer(state: StoreState, patch: StorePatch): StoreState {
  return { ...state, ...patch }
}
