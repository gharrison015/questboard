import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
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

interface QBSchema extends DBSchema {
  family: { key: string; value: Family }
  events: { key: string; value: QBEvent; indexes: { at: string } }
  meta: { key: string; value: LockoutState | DeviceSettings }
}

export class LocalAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase<QBSchema>> | null = null

  private readonly name: string

  constructor(name = 'questboard') {
    this.name = name
  }

  private db(): Promise<IDBPDatabase<QBSchema>> {
    if (!this.dbPromise) {
      const opening = openDB<QBSchema>(this.name, 1, {
        upgrade(db) {
          db.createObjectStore('family')
          const events = db.createObjectStore('events', { keyPath: 'id' })
          events.createIndex('at', 'at')
          db.createObjectStore('meta')
        },
        // A newer version in another tab wants the database: step aside so it can upgrade.
        blocking: () => {
          void opening.then((db) => db.close())
          this.dbPromise = null
        },
        terminated: () => { this.dbPromise = null },
      })
      // A failed open is not cached, so "Try again" really tries again.
      opening.catch(() => { if (this.dbPromise === opening) this.dbPromise = null })
      this.dbPromise = opening
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

  async replaceAll(f: Family, e: QBEvent[], meta?: ReplaceMeta): Promise<void> {
    const tx = (await this.db()).transaction(['family', 'events', 'meta'], 'readwrite')
    const family = tx.objectStore('family')
    const events = tx.objectStore('events')
    const metaStore = tx.objectStore('meta')
    const pending: Promise<unknown>[] = []
    try {
      pending.push(family.clear(), events.clear(), metaStore.clear(), family.put(f, 'current'))
      for (const x of e) pending.push(events.put(x))
      pending.push(
        metaStore.put(meta?.lockout ?? { ...EMPTY_LOCKOUT }, 'lockout'),
        metaStore.put(meta?.device ?? { ...DEFAULT_DEVICE }, 'device'),
      )
      await Promise.all([...pending, tx.done])
    } catch (err) {
      // A put that throws before its request exists would otherwise let the clears commit.
      for (const p of pending) p.catch(() => undefined)
      try { tx.abort() } catch { /* already finished */ }
      await tx.done.catch(() => undefined)
      throw err
    }
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
