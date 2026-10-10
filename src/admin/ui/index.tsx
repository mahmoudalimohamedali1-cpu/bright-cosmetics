import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Minus, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { ProductVisual } from '../../components/ProductVisual'
import type { FulfillmentStatus, OrderStatus, PaymentStatus, Product } from '../../data/types'

/* ───────────── Admin context: theme, toasts, current staff ───────────── */

type Toast = { id: number; text: string }
type AdminCtx = {
  theme: 'light' | 'dark'
  setTheme: (t: 'light' | 'dark') => void
  toast: (text: string) => void
  staff: string
  openPalette: () => void
}
export const AdminContext = createContext<AdminCtx | null>(null)

export function useAdmin() {
  const v = useContext(AdminContext)
  if (!v) throw new Error('useAdmin outside AdminApp')
  return v
}

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <Check size={16} aria-hidden />
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return { toasts, toast }
}

/* ───────────── Layout pieces ───────────── */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
}) {
  const { dir } = useI18n()
  const Chev = dir === 'rtl' ? ChevronRight : ChevronLeft
  return (
    <header className="adm-ph">
      <div style={{ minWidth: 0 }}>
        {back && (
          <Link to={back.to} className="adm-back">
            <Chev size={16} aria-hidden />
            {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="adm-ph__actions">{actions}</div>}
    </header>
  )
}

export function Pane({
  title,
  description,
  actions,
  children,
  footer,
  flush,
  className,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  flush?: boolean
  className?: string
  id?: string
}) {
  return (
    <section className={`pane ${flush ? 'pane--flush' : ''} ${className ?? ''}`} id={id}>
      {(title || actions) && (
        <div className="pane__head">
          <div style={{ minWidth: 0 }}>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      <div className="pane__body">{children}</div>
      {footer && <div className="pane__foot">{footer}</div>}
    </section>
  )
}

/* ───────────── Data atoms ───────────── */

export function Delta({ value, invert, suffix }: { value: number; invert?: boolean; suffix?: string }) {
  const { pct } = useI18n()
  if (!isFinite(value) || Math.abs(value) < 0.005)
    return (
      <span className="delta delta--flat">
        <Minus size={12} aria-hidden />
        {pct(0, 0)}
      </span>
    )
  const good = invert ? value < 0 : value > 0
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`delta ${good ? 'delta--up' : 'delta--down'}`}>
      <Icon size={13} aria-hidden />
      {pct(Math.abs(value), Math.abs(value) < 0.1 ? 1 : 0)}
      {suffix && <span className="faint" style={{ fontWeight: 400 }}>&nbsp;{suffix}</span>}
    </span>
  )
}

export function Badge({ tone, children, plain }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'hollow'; children: ReactNode; plain?: boolean }) {
  return <span className={`badge ${tone ? `badge--${tone}` : ''} ${plain ? 'badge--plain' : ''}`}>{children}</span>
}

export function FulfillmentBadge({ s }: { s: FulfillmentStatus }) {
  const { tx } = useI18n()
  const map: Record<FulfillmentStatus, [string, string, 'ok' | 'warn' | 'bad' | 'info' | undefined]> = {
    unfulfilled: ['لم يُجهّز', 'Unfulfilled', 'warn'],
    packed: ['متجهّز', 'Packed', 'info'],
    shipped: ['مع شركة الشحن', 'Shipped', 'info'],
    delivered: ['اتسلّم', 'Delivered', 'ok'],
    returned: ['مرتجع', 'Returned', 'bad'],
  }
  const [ar, en, tone] = map[s]
  return <Badge tone={tone}>{tx(ar, en)}</Badge>
}

export function PaymentBadge({ s, cod }: { s: PaymentStatus; cod?: boolean }) {
  const { tx } = useI18n()
  const map: Record<PaymentStatus, [string, string, 'ok' | 'warn' | 'bad' | 'info' | undefined]> = {
    pending: cod ? ['تحصيل عند الاستلام', 'COD pending', 'warn'] : ['في الانتظار', 'Pending', 'warn'],
    paid: ['مدفوع', 'Paid', 'ok'],
    refunded: ['مسترد', 'Refunded', undefined],
    partially_refunded: ['مسترد جزئيًا', 'Partly refunded', undefined],
  }
  const [ar, en, tone] = map[s]
  return <Badge tone={tone}>{tx(ar, en)}</Badge>
}

export function OrderStatusBadge({ s }: { s: OrderStatus }) {
  const { tx } = useI18n()
  const map: Record<OrderStatus, [string, string, 'ok' | 'warn' | 'bad' | 'info' | undefined]> = {
    open: ['جديد، محتاج تأكيد', 'New, needs confirming', 'warn'],
    confirmed: ['مؤكَّد', 'Confirmed', 'ok'],
    cancelled: ['ملغي', 'Cancelled', 'bad'],
    archived: ['مؤرشف', 'Archived', undefined],
  }
  const [ar, en, tone] = map[s]
  return <Badge tone={tone}>{tx(ar, en)}</Badge>
}

export function Thumb({ product, size = 'md' }: { product: Product; size?: 'md' | 'lg' }) {
  return (
    <span className={`thumb ${size === 'lg' ? 'thumb--lg' : ''}`}>
      <ProductVisual visual={product.visual} brand={product.brand} bare />
    </span>
  )
}

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return (
    <span className="avatar" aria-hidden>
      {initials}
    </span>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
}

export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

/** Side panel that slides in from the inline-end edge, like a hanok sliding door. */
export function Drawer({ open, onClose, title, children, footer, width }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { tx } = useI18n()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} ref={ref} tabIndex={-1} style={width ? { width: `min(${width}px, 100vw)` } : undefined}>
        <div className="drawer__head">
          <h2>{title}</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label={tx('إغلاق', 'Close')}>
            <X size={18} />
          </button>
        </div>
        <div className="drawer__body">{children}</div>
        {footer && <div className="drawer__foot">{footer}</div>}
      </div>
    </>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg className="empty__mark" viewBox="0 0 64 64" aria-hidden>
        <rect x="6" y="6" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M24 6v18H6M40 6v18h18M6 40h18v18M58 40H40v18M24 24h16v16H24z" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: '44ch' }}>{children}</p>}
      {action}
    </div>
  )
}

/** Recharts tooltip in the admin's language */
export function ChartTip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[]
  label?: string
  format: (v: number, key?: string) => string
  labelFormat?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{labelFormat ? labelFormat(String(label)) : label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="chart-tip__row">
          <span className="chart-tip__key">
            <span className="chart-tip__swatch" style={{ background: p.color }} />
            {p.name}
          </span>
          <strong>{format(Number(p.value), String(p.dataKey))}</strong>
        </div>
      ))}
    </div>
  )
}

export function DemoNote() {
  const { tx } = useI18n()
  return <span className="demo-note">{tx('بيانات تجريبية للعرض', 'Demo data')}</span>
}
