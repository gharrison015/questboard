import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet' | 'danger'
  size?: 'md' | 'lg'
  icon?: IconName
  children?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, children, className, type, ...rest }: ButtonProps) {
  const cls = ['qb-btn', `qb-btn-${variant}`, `qb-btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <button type={type ?? 'button'} className={cls} {...rest}>
      {icon ? <Icon name={icon} size={size === 'lg' ? 26 : 22} /> : null}
      {children}
    </button>
  )
}
