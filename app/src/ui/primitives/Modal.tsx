import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  title: string
  onClose(): void
  children: ReactNode
  className?: string
  /** Full-screen sheet instead of a centered dialog. */
  fullscreen?: boolean
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function Modal({ open, title, onClose, children, className, fullscreen = false }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? ref.current)?.focus()
    return () => before?.focus()
  }, [open])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closeRef.current()
      return
    }
    if (e.key !== 'Tab' || !ref.current) return
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) { e.preventDefault(); return }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === ref.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
  }

  return createPortal(
    <div className="qb-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current() }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={['qb-modal', fullscreen ? 'qb-modal-full' : '', className].filter(Boolean).join(' ')}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
