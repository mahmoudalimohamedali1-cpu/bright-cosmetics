import { useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../../data/types'
import { ProductVisual } from '../../../components/ProductVisual'
import { useI18n } from '../../../i18n'
import { clamp01, reducedMotion, useScrollFrame } from './scroll'

/*
  The giant wordmark repeated across the screen, a bestseller standing in
  front of it. Scroll spins the bottle on its Y axis (two faces, so the label
  reads on both sides), floats it a little, darkens the word and slides it.
*/

export function SpinBand({ product }: { product: Product }) {
  const { tx, pick } = useI18n()
  const ref = useRef<HTMLElement>(null)
  const motion = !reducedMotion()

  useScrollFrame(({ vh }) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.bottom < -100 || r.top > vh + 100) return
    // 0 as the band enters from below, 1 as it leaves above.
    const p = clamp01((vh - r.top) / (vh + r.height))
    el.style.setProperty('--sp', p.toFixed(4))
  }, motion)

  const word = (k: number) => (
    <span className="v-spin__word" key={k}>
      NURI <span lang="ar">نوري</span>
    </span>
  )

  return (
    <section ref={ref} className={`v-spin ${motion ? 'is-live' : ''}`} aria-labelledby="v-spin-h">
      <h2 id="v-spin-h" className="sr-only">
        {tx(`الأكثر مبيعًا: ${pick(product.name)}`, `Bestseller: ${pick(product.name)}`)}
      </h2>
      <div className="v-spin__words" aria-hidden="true">
        {[0, 1, 2].map(word)}
      </div>
      <Link to={`/p/${product.slug}`} className="v-spin__obj" aria-label={tx(`افتحي ${pick(product.name)}`, `Open ${pick(product.name)}`)}>
        <span className="v-spin__float">
          <span className="v-spin__turn">
            <span className="v-spin__face">
              <ProductVisual visual={product.visual} brand={product.brand} />
            </span>
            <span className="v-spin__face v-spin__face--back">
              <ProductVisual visual={product.visual} brand={product.brand} />
            </span>
          </span>
        </span>
      </Link>
    </section>
  )
}
