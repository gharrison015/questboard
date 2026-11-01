import type { ThemeKey } from '../engine/types'

export interface ThemeDef {
  name: string
  accent: string
  img: string
  unit: string
  tier: 'free' | 'paid' | 'pro'
}

export const THEMES: Record<ThemeKey, ThemeDef> = {
  truck: { name: 'Monster Truck', accent: '#ff7a3d', img: 'truck_mascot.png', unit: 'fuel', tier: 'free' },
  unicorn: { name: 'Unicorn', accent: '#ff7ac6', img: 'unicorn_mascot.png', unit: 'sparkles', tier: 'free' },
  tamer: { name: 'Monster Tamer', accent: '#ffd23f', img: 'tamer_mascot.png', unit: 'energy', tier: 'free' },
  dino: { name: 'Dino World', accent: '#3ddc84', img: 'dino_mascot.png', unit: 'eggs', tier: 'free' },
  ocean: { name: 'Ocean Friends', accent: '#39b7ff', img: 'ocean_mascot.png', unit: 'pearls', tier: 'paid' },
  jungle: { name: 'Jungle Safari', accent: '#2e7d32', img: 'jungle_mascot.png', unit: 'bananas', tier: 'paid' },
  race: { name: 'Race Track', accent: '#f2b400', img: 'race_mascot.png', unit: 'nitro', tier: 'paid' },
  candy: { name: 'Candy Land', accent: '#ff5d8f', img: 'candy_mascot.png', unit: 'gummies', tier: 'paid' },
  space: { name: 'Space Explorer', accent: '#4a5be8', img: 'space_mascot.png', unit: 'stardust', tier: 'pro' },
  hero: { name: 'Superhero', accent: '#d32f2f', img: 'hero_mascot.png', unit: 'power', tier: 'pro' },
  royal: { name: 'Royal Kingdom', accent: '#8a3ff0', img: 'royal_mascot.png', unit: 'gold', tier: 'pro' },
  fae: { name: 'Sparkle Fae', accent: '#ff7ac6', img: 'fae_mascot.png', unit: 'stardust', tier: 'pro' },
}

export const THEME_ORDER: ThemeKey[] = [
  'truck', 'unicorn', 'tamer', 'dino', 'ocean', 'jungle', 'race', 'candy', 'space', 'hero', 'royal', 'fae',
]
