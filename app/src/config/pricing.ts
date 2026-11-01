import type { Cents } from '../engine/types'

export const PRICES: Record<'extraKid' | 'unlimitedChores' | 'theme' | 'stickerPack' | 'proMonthly', Cents> = {
  extraKid: 299,
  unlimitedChores: 199,
  theme: 99,
  stickerPack: 99,
  proMonthly: 399,
}

export const PRO_KEY = 'pro'
export const CHORES_UNLIMITED_KEY = 'chores-unlimited'
export const kidSlotKey = (n: number): string => `kid-slot:${n}`
export const themeKey = (key: string): string => `theme:${key}`
export const packKey = (id: string): string => `pack:${id}`
