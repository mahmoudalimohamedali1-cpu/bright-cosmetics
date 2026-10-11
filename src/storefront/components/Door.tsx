import { useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../../i18n'

/*
  A cream panel that slides in from the inline edge, ruled off from the page
  by one plum hairline. Esc closes it, focus moves in on open and returns on
  close, Tab stays inside while it is open.
*/

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  side?: 'end' | 'start'
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Door({ open, onClose, title, side = 'end', children, footer, wide }: Props) {
  const { tx } = useI18n()
  const panel = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => {
      const el = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE)
      el?.focus({ preventScroll: true })
    })
    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = prevOverflow
      const r = restore.current
      if (r && document.contains(r)) r.focus({ preventScroll: true })
    }
  }, [open])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="sf-door-root" data-open={open || undefined} data-side={side} inert={!open}>
      <div className="sf-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className={`sf-door${wide ? ' sf-door--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
      >
        <div className="sf-door__pane">
          <header className="sf-door__head">
            <h2 className="sf-door__title">{title}</h2>
            <button type="button" className="sf-iconbtn sf-door__close" onClick={onClose} aria-label={tx('اقفلي', 'Close')}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="sf-door__body">{children}</div>
          {footer && <footer className="sf-door__foot">{footer}</footer>}
        </div>
      </div>
    </div>
  )
}
