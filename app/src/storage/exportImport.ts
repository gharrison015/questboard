import type { Family, QBEvent } from '../engine/types'

export function exportFamily(family: Family, events: QBEvent[], _recoveryCode?: null): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), family, events }, null, 2)
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseImport(json: string): { family: Family; events: QBEvent[] } | { error: string } {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { error: 'That file is not valid JSON. Pick a QuestBoard export file.' }
  }
  if (!isObj(data)) return { error: 'That file does not look like a QuestBoard export.' }
  if (data.version !== 1) return { error: 'This export is from a different version of QuestBoard and cannot be read.' }
  const f = data.family
  if (
    !isObj(f) ||
    typeof f.id !== 'string' ||
    typeof f.name !== 'string' ||
    typeof f.pinHash !== 'string' ||
    typeof f.pinSalt !== 'string' ||
    !Array.isArray(f.kids)
  ) {
    return { error: 'The family information in this file is missing or incomplete.' }
  }
  if (!Array.isArray(data.events)) return { error: 'The event history in this file is missing.' }
  for (const e of data.events) {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.at !== 'string' || typeof e.type !== 'string') {
      return { error: 'Some events in this file are damaged.' }
    }
  }
  return { family: f as unknown as Family, events: data.events as QBEvent[] }
}
