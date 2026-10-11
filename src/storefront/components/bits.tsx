import type { ReactNode } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Minus, Plus, Star } from 'lucide-react'
import { useI18n } from '../../i18n'

/* Small shared storefront pieces. */

/** A chevron that points "forward" in reading direction (flips in RTL). */
export function Forward({ size = 16 }: { size?: number }) {
  return <ChevronRight size={size} className="sf-flip" aria-hidden="true" />
}
export function Back({ size = 16 }: { size?: number }) {
  return <ChevronLeft size={size} className="sf-flip" aria-hidden="true" />
}
/** The long arrow that rides on pill buttons; points forward in reading direction. */
export function Arrow({ size = 18 }: { size?: number }) {
  return <ArrowRight size={size} strokeWidth={1.75} className="sf-flip sf-arrow" aria-hidden="true" />
}

/* A sunburst outline: 18 soft rays around a circle, drawn once. */
const RAYS = 18
const BURST = Array.from({ length: RAYS * 2 }, (_, i) => {
  const r = i % 2 ? 41 : 49
  const a = (Math.PI * i) / RAYS - Math.PI / 2
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')

/** Lilac sunburst sticker with a short label inside (bestseller, sale, thank-you…). */
export function Sticker({ children, size = 72, className, tone = 'lilac' }: { children?: ReactNode; size?: number; className?: string; tone?: 'lilac' | 'lemon' | 'cream' }) {
  return (
    <span className={`sf-sticker sf-sticker--${tone}${className ? ` ${className}` : ''}`} style={{ inlineSize: size, blockSize: size }}>
      <svg className="sf-sticker__burst" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <polygon points={BURST} />
      </svg>
      {children && <span className="sf-sticker__t">{children}</span>}
    </span>
  )
}

export function Stars({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  const { tx, num } = useI18n()
  // A product with no reviews shows no stars rather than an empty rating
  if (count !== undefined && count <= 0) return null
  const label =
    count === undefined
      ? tx(`التقييم ${num(rating)} من ٥`, `Rated ${num(rating)} out of 5`)
      : tx(`التقييم ${num(rating)} من ٥ من ${num(count)} تقييم`, `Rated ${num(rating)} out of 5 from ${num(count)} reviews`)
  return (
    <span className="sf-stars" role="img" aria-label={label}>
      <span className="sf-stars__row" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - (i - 1)))
          return (
            <span key={i} className="sf-star">
              <Star size={size} className="sf-star__bg" />
              <span className="sf-star__fg" style={{ inlineSize: `${fill * 100}%` }}>
                <Star size={size} />
              </span>
            </span>
          )
        })}
      </span>
      <span className="sf-stars__num" aria-hidden="true">
        {num(rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        {count !== undefined && <span className="sf-muted"> ({num(count)})</span>}
      </span>
    </span>
  )
}

export function Price({ price, compareAt, big }: { price: number; compareAt?: number; big?: boolean }) {
  const { tx, money } = useI18n()
  return (
    <span className={`sf-price${big ? ' sf-price--big' : ''}`}>
      <span className="sf-price__now">{money(price)}</span>
      {compareAt && compareAt > price && (
        <s className="sf-price__was">
          <span className="sr-only">{tx('بدل', 'was')} </span>
          {money(compareAt)}
        </s>
      )}
    </span>
  )
}

export function Stepper({
  value,
  onChange,
  max,
  min = 1,
  label,
}: {
  value: number
  onChange: (n: number) => void
  max: number
  min?: number
  label: string
}) {
  const { tx, num } = useI18n()
  return (
    <div className="sf-stepper" role="group" aria-label={label}>
      <button type="button" className="sf-stepper__btn" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={tx('قلّلي واحدة', 'Decrease quantity')}>
        <Minus size={16} aria-hidden="true" />
      </button>
      <output className="sf-stepper__val" aria-live="polite">
        {num(value)}
      </output>
      <button type="button" className="sf-stepper__btn" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={tx('زوّدي واحدة', 'Increase quantity')}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
