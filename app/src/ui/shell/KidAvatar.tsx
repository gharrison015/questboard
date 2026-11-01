import type { Kid } from '../../engine/types'
import { THEMES } from '../../config/themes'

export function buddyUrl(kid: Kid): string {
  return `${import.meta.env.BASE_URL}buddies/${THEMES[kid.theme].img}`
}

/** The kid's photo when set, else the buddy mascot. Decorative: the name is always beside it. */
export function KidAvatar({ kid, size = 40 }: { kid: Kid; size?: number }) {
  return (
    <img
      className="qb-avatar"
      src={kid.photo ?? buddyUrl(kid)}
      alt=""
      width={size}
      height={size}
      draggable={false}
    />
  )
}
