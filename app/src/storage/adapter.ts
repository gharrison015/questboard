import type { Appearance, Family, QBEvent } from '../engine/types'
import type { LockoutState } from '../security/session'

export interface DeviceSettings {
  modeOverride: 'auto' | 'phone' | 'tablet' | 'tv'
  appearanceOverride: Appearance | null
}

export interface LoadedState {
  family: Family | null
  events: QBEvent[]
  lockout: LockoutState
  device: DeviceSettings
}

export interface ReplaceMeta {
  lockout?: LockoutState
  device?: DeviceSettings
}

export interface StorageAdapter {
  load(): Promise<LoadedState>
  /** Replaces the family, every event and the meta records in one step: all of it lands, or none of it. */
  replaceAll(family: Family, events: QBEvent[], meta?: ReplaceMeta): Promise<void>
  saveFamily(f: Family): Promise<void>
  appendEvents(e: QBEvent[]): Promise<void>
  saveLockout(s: LockoutState): Promise<void>
  saveDevice(d: DeviceSettings): Promise<void>
  wipe(): Promise<void>
}

export const DEFAULT_DEVICE: DeviceSettings = Object.freeze({ modeOverride: 'auto', appearanceOverride: null })
export const EMPTY_LOCKOUT: LockoutState = Object.freeze({ failures: 0, lockedUntil: null })

export function sortEvents(events: QBEvent[]): QBEvent[] {
  return [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
