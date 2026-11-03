/**
 * Device catalog for the Device Lab. Sizes are CSS pixels in portrait (what the browser reports
 * as innerWidth and innerHeight on the real device, full screen as an installed app). Insets are
 * the safe areas the real device reports, so the app pads around the notch and home bar the same way.
 */

export type Chrome = 'island' | 'homebutton' | 'punch' | 'tablet' | 'fold' | 'dual' | 'browser' | 'tv'

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Device {
  id: string
  name: string
  group: 'iPhone' | 'iPad' | 'Android' | 'Fold and dual' | 'Web' | 'TV and displays'
  width: number
  height: number
  chrome: Chrome
  touch: boolean
  /** Starts sideways (TV, smart displays, web). */
  landscape?: boolean
  /** False for devices that only ever sit one way. */
  rotates: boolean
  portraitInsets: Insets
  landscapeInsets: Insets
  /** Gap between the two screens of a dual-screen device, in CSS px. */
  hinge?: number
}

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
const ISLAND_P: Insets = { top: 62, right: 0, bottom: 34, left: 0 }
const ISLAND_L: Insets = { top: 0, right: 62, bottom: 21, left: 62 }
const IPAD: Insets = { top: 24, right: 0, bottom: 20, left: 0 }
const ANDROID_P: Insets = { top: 36, right: 0, bottom: 24, left: 0 }
const ANDROID_L: Insets = { top: 24, right: 36, bottom: 0, left: 0 }

export const DEVICES: Device[] = [
  { id: 'iphone-17-pro', name: 'iPhone 17 Pro', group: 'iPhone', width: 402, height: 874, chrome: 'island', touch: true, rotates: true, portraitInsets: ISLAND_P, landscapeInsets: ISLAND_L },
  { id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', group: 'iPhone', width: 440, height: 956, chrome: 'island', touch: true, rotates: true, portraitInsets: ISLAND_P, landscapeInsets: ISLAND_L },
  { id: 'iphone-se', name: 'iPhone SE', group: 'iPhone', width: 375, height: 667, chrome: 'homebutton', touch: true, rotates: true, portraitInsets: { top: 20, right: 0, bottom: 0, left: 0 }, landscapeInsets: NONE },
  { id: 'ipad-mini', name: 'iPad mini', group: 'iPad', width: 744, height: 1133, chrome: 'tablet', touch: true, rotates: true, portraitInsets: IPAD, landscapeInsets: IPAD },
  { id: 'ipad-air-11', name: 'iPad Air 11 in', group: 'iPad', width: 820, height: 1180, chrome: 'tablet', touch: true, landscape: true, rotates: true, portraitInsets: IPAD, landscapeInsets: IPAD },
  { id: 'ipad-pro-13', name: 'iPad Pro 13 in', group: 'iPad', width: 1032, height: 1376, chrome: 'tablet', touch: true, landscape: true, rotates: true, portraitInsets: IPAD, landscapeInsets: IPAD },
  { id: 'pixel-9', name: 'Pixel 9', group: 'Android', width: 412, height: 915, chrome: 'punch', touch: true, rotates: true, portraitInsets: ANDROID_P, landscapeInsets: ANDROID_L },
  { id: 'galaxy-s25', name: 'Galaxy S25', group: 'Android', width: 360, height: 780, chrome: 'punch', touch: true, rotates: true, portraitInsets: ANDROID_P, landscapeInsets: ANDROID_L },
  { id: 'fire-7', name: 'Fire 7 tablet', group: 'Android', width: 600, height: 1024, chrome: 'tablet', touch: true, landscape: true, rotates: true, portraitInsets: NONE, landscapeInsets: NONE },
  { id: 'fold-cover', name: 'Galaxy Z Fold, closed', group: 'Fold and dual', width: 344, height: 882, chrome: 'punch', touch: true, rotates: true, portraitInsets: ANDROID_P, landscapeInsets: ANDROID_L },
  { id: 'fold-open', name: 'Galaxy Z Fold, open', group: 'Fold and dual', width: 880, height: 1030, chrome: 'fold', touch: true, landscape: true, rotates: true, portraitInsets: { top: 32, right: 0, bottom: 24, left: 0 }, landscapeInsets: { top: 32, right: 0, bottom: 24, left: 0 } },
  { id: 'duo', name: 'Dual screen, spanned', group: 'Fold and dual', width: 720, height: 1114, chrome: 'dual', touch: true, landscape: true, rotates: true, hinge: 26, portraitInsets: { top: 0, right: 0, bottom: 0, left: 0 }, landscapeInsets: NONE },
  { id: 'web-laptop', name: 'Laptop browser', group: 'Web', width: 800, height: 1280, chrome: 'browser', touch: false, landscape: true, rotates: false, portraitInsets: NONE, landscapeInsets: NONE },
  { id: 'web-desktop', name: 'Desktop browser', group: 'Web', width: 1000, height: 1600, chrome: 'browser', touch: false, landscape: true, rotates: false, portraitInsets: NONE, landscapeInsets: NONE },
  { id: 'tv', name: 'TV 1080p', group: 'TV and displays', width: 1080, height: 1920, chrome: 'tv', touch: false, landscape: true, rotates: false, portraitInsets: NONE, landscapeInsets: NONE },
  { id: 'echo-show-5', name: 'Echo Show 5', group: 'TV and displays', width: 480, height: 960, chrome: 'tv', touch: true, landscape: true, rotates: false, portraitInsets: NONE, landscapeInsets: NONE },
]

export const GROUPS = ['iPhone', 'iPad', 'Android', 'Fold and dual', 'Web', 'TV and displays'] as const

/** Three devices for the side by side view: one phone of each kind and a tablet. */
export const COMPARE_SET = ['iphone-17-pro', 'pixel-9', 'ipad-air-11']

export function deviceById(id: string | null | undefined): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0]
}

export interface Screen {
  width: number
  height: number
  insets: Insets
}

/** The screen the app sees for a device held one way. */
export function screenFor(d: Device, landscape: boolean): Screen {
  return landscape
    ? { width: d.height, height: d.width, insets: d.landscapeInsets }
    : { width: d.width, height: d.height, insets: d.portraitInsets }
}

/** Frame padding around the screen (the bezel), in CSS px before scaling. */
export function bezelFor(chrome: Chrome): number {
  switch (chrome) {
    case 'browser': return 0
    case 'tv': return 14
    case 'tablet': case 'fold': case 'dual': return 18
    default: return 12
  }
}

/** Extra height the frame adds above the screen (browser toolbar, home button chin). */
export function chromeExtra(chrome: Chrome, landscape: boolean): { top: number; bottom: number; left: number; right: number } {
  if (chrome === 'browser') return { top: 40, bottom: 0, left: 0, right: 0 }
  if (chrome === 'homebutton') return landscape ? { top: 0, bottom: 0, left: 56, right: 56 } : { top: 56, bottom: 72, left: 0, right: 0 }
  if (chrome === 'tv') return { top: 0, bottom: 22, left: 0, right: 0 }
  return { top: 0, bottom: 0, left: 0, right: 0 }
}

/** Scale that fits a frame of the given outer size into the space available, never above 1. */
export function fitScale(outerW: number, outerH: number, availW: number, availH: number): number {
  if (outerW <= 0 || outerH <= 0 || availW <= 0 || availH <= 0) return 1
  return Math.min(1, availW / outerW, availH / outerH)
}
