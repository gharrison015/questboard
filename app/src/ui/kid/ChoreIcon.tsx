import { choreIconPath } from '../../content/choreIcons'
import { ICONS } from '../primitives/icons'

/** A chore's own icon, or the generic chores icon when the name is unknown. */
export function ChoreIcon({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <svg
      className="qb-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: choreIconPath(name) ?? ICONS.chores }}
    />
  )
}
