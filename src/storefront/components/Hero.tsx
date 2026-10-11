import { useRef } from 'react'
import { useI18n } from '../../i18n'
import { PHOTOS } from '../media'
import { LetterDrop } from './home/LetterDrop'
import { Pill, SparkSticker } from './home/Glyphs'
import { clamp01, reducedMotion, useScrollFrame } from './home/scroll'

/*
  The intro. A full-bleed photo under the transparent header; the headline
  drops in (letters for Latin, words for Arabic) with a springy overshoot.
  Scrolling the first 60% of the viewport shrinks the photo into an inset
  rounded card: one CSS var (--hp, 0..1) and a computed scale (--hs).
  Reduced motion: no drop, no shrink.
*/

export function Hero() {
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

  const ph = PHOTOS.hero
  const headline = tx('بشرتك، بس أحلى.', 'Glow, cultured in Seoul.')

  return (
    <section className={`v-hero ${motion ? 'is-live' : ''}`} data-v-hero aria-labelledby="v-hero-h">
      <div className="v-hero__card" ref={card}>
        <img
          className="v-hero__img"
          src={ph.src(1600)}
          srcSet={[640, 960, 1280, 1600, 2200].map((w) => `${ph.src(w)} ${w}w`).join(', ')}
          sizes="100vw"
          alt={ph.alt[lang]}
          fetchPriority="high"
          decoding="async"
        />
        <div className="v-hero__shade" aria-hidden="true" />
        <div className="v-hero__copy">
          <SparkSticker className="v-hero__sticker" />
          <h1 id="v-hero-h" className="v-hero__h" key={lang}>
            <LetterDrop text={headline} lang={lang} />
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
