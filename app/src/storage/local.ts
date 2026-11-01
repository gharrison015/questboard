import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Family, QBEvent } from '../engine/types'
import type { LockoutState } from '../security/session'
import {
  DEFAULT_DEVICE,
  EMPTY_LOCKOUT,
  sortEvents,
  type DeviceSettings,
  type LoadedState,
  type StorageAdapter,
} from './adapter'

interface QBSchema extends DBSchema {
  family: { key: string; value: Family }
  events: { key: string; value: QBEvent; indexes: { at: string } }
  meta: { key: string; value: LockoutState | DeviceSettings }
}

export class LocalAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase<QBSchema>> | null = null

  constructor(private readonly name = 'questboard') {}

  private db(): Promise<IDBPDatabase<QBSchema>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<QBSchema>(this.name, 1, {
        upgrade(db) {
          db.createObjectStore('family')
          const events = db.createObjectStore('events', { keyPath: 'id' })
          events.createIndex('at', 'at')
          db.createObjectStore('meta')
        },
      })
    }
    return this.dbPromise
  }

  async load(): Promise<LoadedState> {
    const db = await this.db()
    const family = (await db.get('family', 'current')) ?? null
    const events = sortEvents(await db.getAll('events'))
    const lockout = ((await db.get('meta', 'lockout')) as LockoutState | undefined) ?? { ...EMPTY_LOCKOUT }
    const device = ((await db.get('meta', 'device')) as DeviceSettings | undefined) ?? { ...DEFAULT_DEVICE }
    return { family, events, lockout, device }
  }

  async saveFamily(f: Family): Promise<void> {
    await (await this.db()).put('family', f, 'current')
  }

  async appendEvents(e: QBEvent[]): Promise<void> {
    const tx = (await this.db()).transaction('events', 'readwrite')
    await Promise.all([...e.map((x) => tx.store.put(x)), tx.done])
  }

  async saveLockout(s: LockoutState): Promise<void> {
    await (await this.db()).put('meta', s, 'lockout')
  }

  async saveDevice(d: DeviceSettings): Promise<void> {
    await (await this.db()).put('meta', d, 'device')
  }

  async wipe(): Promise<void> {
    const tx = (await this.db()).transaction(['family', 'events', 'meta'], 'readwrite')
    await Promise.all([tx.objectStore('family').clear(), tx.objectStore('events').clear(), tx.objectStore('meta').clear(), tx.done])
  }
}
