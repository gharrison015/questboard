import type { HTMLAttributes } from 'react'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={['qb-card', className].filter(Boolean).join(' ')} {...rest} />
}
