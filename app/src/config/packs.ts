import { PRICES } from './pricing'

export interface PackDef { id: string; name: string; price: number; items: string[] }

/** Sticker packs. Ownership only this round; equipping a sticker on the buddy comes later. */
export const PACKS: PackDef[] = [
  { id: 'party', name: 'Party', price: PRICES.stickerPack, items: ['\u{1F389}', '\u{1F382}', '\u{1F388}', '\u{1F381}', '\u{1FA85}'] },
  { id: 'winter', name: 'Winter', price: PRICES.stickerPack, items: ['⛄', '❄️', '\u{1F9E3}', '\u{1F3BF}', '☃️'] },
  { id: 'royal', name: 'Royal', price: PRICES.stickerPack, items: ['\u{1F451}', '\u{1F3F0}', '\u{1F48E}', '\u{1F5E1}️', '\u{1F9DA}'] },
  { id: 'sport', name: 'Sport', price: PRICES.stickerPack, items: ['⚽', '\u{1F3C0}', '⚾', '\u{1F3C6}', '\u{1F94A}'] },
]
