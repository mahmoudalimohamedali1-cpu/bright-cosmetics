import { useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useI18n } from '../../i18n'
import { useActiveProducts } from '../lib'
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
export function Hero({ hold = 0 }: { hold?: number }) {
  const { tx, lang } = useI18n()
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

  // The store's own bestsellers stand in the hero instead of a model photo
  const products = useActiveProducts()
  const stage = useMemo(() => {
    const order = [
      'the-ordinary-niacinamide-10-zinc-1',
      'anua-niacinamide-10-txa-4-serum',
      'dr-althea-345-relief-cream',
      'eqqualberry-lush-blush-nad-peptide-boosting-serum',
      'arencia-fresh-rosehip-rice-mochi-cleanser',
    ]
    const picked = order.map((s) => products.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => !!p)
    return picked.length >= 3 ? picked : products.filter((p) => p.image).slice(0, 5)
  }, [products])
  const headline = tx('بشرتك، بس أحلى.', 'Your skin, only brighter.')

  return (
    <section
      className={`v-hero ${motion ? 'is-live' : ''}`}
      data-v-hero
      aria-labelledby="v-hero-h"
      style={{ ['--hold' as string]: `${hold}ms` } as CSSProperties}
    >
      <div className="v-hero__card" ref={card}>
        <ProductGroup products={stage} className="v-hero__stage" size="lg" />
        <div className="v-hero__copy">
          <SparkSticker className="v-hero__sticker" />
          <h1 id="v-hero-h" className="v-hero__h" key={lang}>
            <LetterDrop text={headline} lang={lang} delay={180 + hold} step={45} />
          </h1>
          <p className="v-hero__sub">
            {tx('سكين كير كوري ومستورد أصلي، متختار على قد بشرتك.', 'Authentic Korean & imported skincare, matched to your skin.')}
          </p>
        </div>
        <div className="v-hero__cta">
          <Pill to="/shop">{tx('تسوقي دلوقتي', 'Shop now')}</Pill>
        </div>
      </div>
    </section>
  )
}
