import { ChevronLeft, ChevronRight, Minus, Plus, Star } from 'lucide-react'
import { useI18n } from '../../i18n'

/* Small shared storefront pieces. */

/** A chevron that points "forward" in reading direction (flips in RTL). */
export function Forward({ size = 16 }: { size?: number }) {
  return <ChevronRight size={size} className="sf-flip" aria-hidden="true" />
}
export function Back({ size = 16 }: { size?: number }) {
  return <ChevronLeft size={size} className="sf-flip" aria-hidden="true" />
}

export function Stars({ rating, count, size = 14 }: { rating: number; count?: number; size?: number }) {
  const { tx, num } = useI18n()
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
