import { ICONS, type IconName } from './icons'

export type { IconName }

interface IconProps {
  name: IconName
  /** Tinted fill for the active state of a tab icon. */
  filled?: boolean
  size?: number
}

export function Icon({ name, filled = false, size = 24 }: IconProps) {
  return (
    <svg
      className="qb-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.28 : undefined}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}
