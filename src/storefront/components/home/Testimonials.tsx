import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Review } from '../../../data/types'
import { SKIN_LABEL } from '../../../data/catalog'
import { useI18n } from '../../../i18n'
import { useStore } from '../../../store'
import { SparkSticker } from './Glyphs'

/*
  Three five-star published reviews from the store, in the shopper's language
  where possible. These are the store's own (sample) reviews: no celebrity
  labels, no stock faces, initials only.
*/

/** Latin: two initials. Arabic: the first letter only (initials don't read well joined). */
function initials(name: string) {
  const w = name.split(/\s+/).filter(Boolean)
  if (/[؀-ۿ]/.test(name)) return w[0]?.[0] ?? ''
  return w
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()
}

export function Testimonials() {
  const { tx, pick, lang: ui } = useI18n()
  const reviews = useStore((s) => s.reviews)
  const customers = useStore((s) => s.customers)
  const [at, setAt] = useState(0)

  const picks = useMemo(() => {
    const five = reviews.filter((r) => r.status === 'published' && r.rating === 5)
    const seen = new Set<string>()
    const out: Review[] = []
    const take = (list: Review[]) => {
      for (const r of list) {
        if (out.length >= 3) return
        if (seen.has(r.body)) continue
        seen.add(r.body)
        out.push(r)
      }
    }
    take(five.filter((r) => r.lang === ui))
    take(five.filter((r) => r.lang !== ui))
    return out
  }, [reviews, ui])

  if (!picks.length) return null
  const i = Math.min(at, picks.length - 1)
  const r = picks[i]
  const c = customers.find((x) => x.id === r.customerId)
  const name = c ? pick(c.name) : tx('عميلة برايت', 'Bright shopper')
  const go = (d: number) => setAt((i + d + picks.length) % picks.length)

  return (
    <section className="v-quotes" aria-labelledby="v-quotes-h" aria-roledescription={tx('عرض متتابع', 'carousel')}>
      <h2 id="v-quotes-h" className="sr-only">{tx('آراء العميلات', 'What shoppers say')}</h2>
      <SparkSticker className="v-quotes__sticker" />
      <div className="v-quotes__row">
        <button type="button" className="v-arrow" onClick={() => go(-1)} aria-label={tx('الرأي اللي قبله', 'Previous review')}>
          <ArrowLeft size={24} strokeWidth={1.5} className="v-flip" aria-hidden="true" />
        </button>
        <figure className="v-quotes__fig" aria-live="polite" key={r.id}>
          <blockquote className="v-quotes__q" lang={r.lang} dir={r.lang === 'ar' ? 'rtl' : 'ltr'}>
            <p>{r.lang === 'ar' ? `«${r.body}»` : `“${r.body}”`}</p>
          </blockquote>
          <figcaption className="v-quotes__by">
            <span className="v-avatar" aria-hidden="true">{initials(name)}</span>
            <span className="v-quotes__meta">
              <span className="v-quotes__name">{name}</span>
              <span className="v-quotes__sub">
                {tx(`بشرة ${SKIN_LABEL[r.skinType].ar}`, `${SKIN_LABEL[r.skinType].en} skin`)}
                {r.verified ? ` · ${tx('اشترت فعلًا', 'Verified purchase')}` : ''}
              </span>
            </span>
          </figcaption>
        </figure>
        <button type="button" className="v-arrow" onClick={() => go(1)} aria-label={tx('الرأي اللي بعده', 'Next review')}>
          <ArrowRight size={24} strokeWidth={1.5} className="v-flip" aria-hidden="true" />
        </button>
      </div>
      <div className="v-dots">
        {picks.map((p, k) => (
          <button
            type="button"
            key={p.id}
            className="v-dots__b"
            aria-current={k === i || undefined}
            aria-label={tx(`رأي ${k + 1} من ${picks.length}`, `Review ${k + 1} of ${picks.length}`)}
            onClick={() => setAt(k)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
