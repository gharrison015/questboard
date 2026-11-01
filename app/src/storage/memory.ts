import type { Family, QBEvent } from '../engine/types'
import type { LockoutState } from '../security/session'
import {
  DEFAULT_DEVICE,
  EMPTY_LOCKOUT,
  sortEvents,
  type DeviceSettings,
  type LoadedState,
  type ReplaceMeta,
  type StorageAdapter,
} from './adapter'

export class InMemoryAdapter implements StorageAdapter {
  private family: Family | null = null
  private events = new Map<string, QBEvent>()
  private lockout: LockoutState = EMPTY_LOCKOUT
  private device: DeviceSettings = DEFAULT_DEVICE

  async load(): Promise<LoadedState> {
    return {
      family: this.family ? structuredClone(this.family) : null,
      events: sortEvents(structuredClone([...this.events.values()])),
      lockout: { ...this.lockout },
      device: { ...this.device },
    }
  }
  async replaceAll(f: Family, e: QBEvent[], meta?: ReplaceMeta): Promise<void> {
    // Clone everything first, so a bad value throws before anything changes.
    const family = structuredClone(f)
    const events = new Map(e.map((x) => [x.id, structuredClone(x)] as const))
    this.family = family
    this.events = events
    this.lockout = meta?.lockout ? { ...meta.lockout } : EMPTY_LOCKOUT
    this.device = meta?.device ? { ...meta.device } : DEFAULT_DEVICE
  }
  async saveFamily(f: Family): Promise<void> {
    this.family = structuredClone(f)
  }
  async appendEvents(e: QBEvent[]): Promise<void> {
    for (const x of e) this.events.set(x.id, structuredClone(x))
  }
  async saveLockout(s: LockoutState): Promise<void> {
    this.lockout = { ...s }
  }
  async saveDevice(d: DeviceSettings): Promise<void> {
    this.device = { ...d }
  }
  async wipe(): Promise<void> {
    this.family = null
    this.events.clear()
    this.lockout = EMPTY_LOCKOUT
    this.device = DEFAULT_DEVICE
  }
}
