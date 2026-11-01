import { Icon, type IconName } from './Icon'

interface SectionHeadProps {
  icon: IconName
  title: string
  meta?: string
  metaTone?: 'count' | 'good' | 'bad'
}

export function SectionHead({ icon, title, meta, metaTone = 'count' }: SectionHeadProps) {
  return (
    <div className="qb-shead">
      <span className="qb-shead-ico"><Icon name={icon} size={22} /></span>
      <h3 className="qb-shead-title">{title}</h3>
      {meta ? <span className={`qb-shead-meta qb-meta-${metaTone}`}>{meta}</span> : null}
    </div>
  )
}
