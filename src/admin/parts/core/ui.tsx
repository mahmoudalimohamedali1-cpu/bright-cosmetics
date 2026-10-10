import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../../../i18n'
import './core.css'

/** Horizontal bar list on the lattice: label, meter, value. Each row can link to its records. */
export function BarList({
  rows,
  empty,
}: {
  rows: { key: string; label: ReactNode; value: number; display: ReactNode; to?: string; sub?: ReactNode }[]
  empty?: ReactNode
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <div className="core-barlist__empty muted small">{empty}</div>
  return (
    <ul className="core-barlist">
      {rows.map((r) => {
        const inner = (
          <>
            <span className="core-barlist__label ellipsis">{r.label}</span>
            <span className="core-barlist__value num">{r.display}</span>
            <span className="core-barlist__track" aria-hidden>
              <span style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
            </span>
            {r.sub && <span className="core-barlist__sub tiny faint">{r.sub}</span>}
          </>
        )
        return <li key={r.key}>{r.to ? <Link to={r.to}>{inner}</Link> : <div>{inner}</div>}</li>
      })}
    </ul>
  )
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="core-legend" role="list">
      {items.map((i) => (
        <span key={i.label} role="listitem" className="core-legend__item">
          <svg width="18" height="8" aria-hidden>
            <line x1="1" y1="4" x2="17" y2="4" stroke={i.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={i.dashed ? '4 3' : undefined} />
          </svg>
          {i.label}
        </span>
      ))}
    </div>
  )
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" className="core-chip" aria-pressed={on} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const { tx, num, dir } = useI18n()
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total ? page * pageSize + 1 : 0
  const to = Math.min(total, (page + 1) * pageSize)
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight
  return (
    <div className="core-pager">
      <span className="num">
        {tx(`${num(from)}–${num(to)} من ${num(total)}`, `${num(from)}–${num(to)} of ${num(total)}`)}
      </span>
      <div className="row">
        <button className="btn btn--sm btn--icon" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label={tx('الصفحة السابقة', 'Previous page')}>
          <Prev size={16} />
        </button>
        <span className="small num">
          {num(page + 1)} / {num(pages)}
        </span>
        <button className="btn btn--sm btn--icon" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label={tx('الصفحة التالية', 'Next page')}>
          <Next size={16} />
        </button>
      </div>
    </div>
  )
}

/** Directional chevron that flips with the reading direction. */
export function Forward({ size = 16 }: { size?: number }) {
  const { dir } = useI18n()
  const C = dir === 'rtl' ? ChevronLeft : ChevronRight
  return <C size={size} aria-hidden className="core-fwd" />
}
