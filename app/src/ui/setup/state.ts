import { STARTER_CHORES } from '../../content/starterChores'
import { FREE_LIMITS, FREE_THEMES } from '../../config/limits'
import { MONEY_PRESETS } from '../../engine/money'
import { applyFamilyAction, newFamily, type FamilyAction } from '../../engine/reducer'
import type { Family, Grade, ThemeKey } from '../../engine/types'
import { hashPin, makeSalt, normalizeRecoveryCode } from '../../security/pin'

export type PresetKey = keyof typeof MONEY_PRESETS
export const ROUTINE_NAMES = ['Morning', 'Bedtime', 'Nighttime'] as const

export interface KidDraft {
  key: number
  name: string
  grade: Grade
  theme: ThemeKey
  photo?: string
}

export interface WizardState {
  familyName: string
  pin: string
  pinAgain: string
  code: string
  wrote: boolean
  kids: KidDraft[]
  preset: PresetKey
  chores: string[]
  routines: Record<(typeof ROUTINE_NAMES)[number], boolean>
}

export const MAX_KIDS = FREE_LIMITS.kids
export const MAX_CHORES = FREE_LIMITS.choresPerKid

let nextKey = 1
export function blankKid(taken: ThemeKey[]): KidDraft {
  const theme = FREE_THEMES.find((t) => !taken.includes(t)) ?? FREE_THEMES[0]
  return { key: nextKey++, name: '', grade: 'K', theme }
}

export function initialState(): WizardState {
  return {
    familyName: '', pin: '', pinAgain: '', code: '', wrote: false,
    kids: [blankKid([])],
    preset: 'both',
    chores: STARTER_CHORES.filter((c) => c.preChecked).map((c) => c.label),
    routines: { Morning: true, Bedtime: true, Nighttime: false },
  }
}

/** Builds the finished family by applying the setup choices as ordinary actions, in order. */
export async function buildFamily(s: WizardState): Promise<Family> {
  const salt = makeSalt()
  const apply = (f: Family, a: FamilyAction): Family => applyFamilyAction(f, a)
  let f = newFamily(s.familyName.trim())
  f = apply(f, {
    type: 'pin.set',
    pinSalt: salt,
    pinHash: await hashPin(s.pin, salt),
    recoveryHash: await hashPin(normalizeRecoveryCode(s.code), salt),
  })
  const preset = MONEY_PRESETS[s.preset]
  f = apply(f, { type: 'money.set', money: { ...f.money, ...preset } })
  for (const name of ROUTINE_NAMES) {
    const r = f.routines.find((x) => x.name === name)
    if (r && !s.routines[name]) f = apply(f, { type: 'routine.update', id: r.id, patch: { days: [] } })
  }
  const routineIds = f.routines.map((r) => r.id)
  for (const k of s.kids) {
    f = apply(f, {
      type: 'kid.add',
      kid: { name: k.name.trim(), grade: k.grade, theme: k.theme, photo: k.photo, chores: [], routineIds: [] },
    })
    const id = f.kids[f.kids.length - 1].id
    for (const c of STARTER_CHORES.filter((x) => s.chores.includes(x.label))) {
      f = apply(f, {
        type: 'chore.add',
        kidId: id,
        chore: { label: c.label, icon: c.icon, days: [...c.days], pay: c.paid ? preset.chorePayDefault : 0, active: true },
      })
    }
    f = apply(f, { type: 'kid.update', id, patch: { routineIds } })
  }
  return f
}
