import { useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Product } from '../../data/types'
import { useI18n } from '../../i18n'
import { ProductGroup } from './home/ProductGroup'
import { LetterDrop } from './home/LetterDrop'
import { Pill, SparkSticker } from './home/Glyphs'
import { clamp01, reducedMotion, useScrollFrame } from './home/scroll'

/*
  The intro. The store's own bestsellers on a blush stage; the headline
  drops in (letters for Latin, words for Arabic) with a springy overshoot.
  Scrolling the first 60% of the viewport shrinks the photo into an inset
  rounded card: one CSS var (--hp, 0..1) and a computed scale (--hs).
  Reduced motion: no drop, no shrink.
*/

/** `hold` delays the entrance (ms) while the preloader is still on screen. */
export function Hero({
  hold = 0,
  headline,
  sub,
  cta,
  href,
  products,
}: {
  hold?: number
  headline: string
  sub: string
  cta: string
  href: string
  products: Product[]
}) {
  const { lang } = useI18n()
  const card = useRef<HTMLDivElement>(null)
  const motion = !reducedMotion()

  useScrollFrame(({ y, vh, vw }) => {
    const el = card.current
    if (!el) return
    const p = clamp01(y / (vh * 0.6))
    const gap = vw < 640 ? 12 : 24
    el.style.setProperty('--hp', p.toFixed(4))
    el.style.setProperty('--hs', (1 - (p * gap * 2) / vw).toFixed(5))
  }, motion)

  return (
    <section
      className={`v-hero ${motion ? 'is-live' : ''}`}
      data-v-hero
      aria-labelledby={headline ? 'v-hero-h' : undefined}
      style={{ ['--hold' as string]: `${hold}ms` } as CSSProperties}
    >
      <div className="v-hero__card" ref={card}>
        <ProductGroup products={products} className="v-hero__stage" size="lg" />
        <div className="v-hero__copy">
          <SparkSticker className="v-hero__sticker" />
          {headline && (
            <h1 id="v-hero-h" className="v-hero__h" key={lang}>
              <LetterDrop text={headline} lang={lang} delay={180 + hold} step={45} />
            </h1>
          )}
          {sub && <p className="v-hero__sub">{sub}</p>}
        </div>
        {cta && (
          <div className="v-hero__cta">
            <Pill to={href}>{cta}</Pill>
          </div>
        )}
      </div>
    </section>
  )
}
