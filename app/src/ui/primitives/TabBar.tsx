import { Icon, type IconName } from './Icon'

export interface TabDef { id: string; icon: IconName; label: string }

interface TabBarProps {
  tabs: TabDef[]
  active: string
  onChange(id: string): void
  /** Bottom on phone (respects the home-indicator inset), top on tablet. */
  placement?: 'bottom' | 'top'
}

export function TabBar({ tabs, active, onChange, placement = 'bottom' }: TabBarProps) {
  return (
    <nav className={`qb-tabbar qb-tabbar-${placement}`} aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className="qb-tab"
          aria-current={t.id === active ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          <Icon name={t.icon} filled={t.id === active} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
