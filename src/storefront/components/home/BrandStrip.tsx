import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../i18n'
import { brandSlug, useActiveProducts } from '../../lib'
import { SocialIcons } from './WildStrip'

/*
  "Shop by brand": one blush card per brand the store actually carries,
  each showing that brand's own bottle. Scrolls inside its own strip.
*/

export function BrandStrip() {
  const { tx, num } = useI18n()
  const products = useActiveProducts()
  const brands = useMemo(() => {
    const m = new Map<string, { brand: string; image?: string; count: number }>()
    for (const p of products) {
      const e = m.get(p.brand) ?? { brand: p.brand, image: undefined, count: 0 }
      e.count++
      if (!e.image && p.image) e.image = p.image
      m.set(p.brand, e)
    }
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [products])

  return (
    <section className="v-brands" aria-labelledby="v-brands-h">
      <div className="v-wrap v-brands__head">
        <h2 id="v-brands-h" className="v-h2">{tx('تسوقي بالماركة.', 'Shop by brand.')}</h2>
        <p className="v-mono">
          {tx('ماركات كورية ومستوردة أصلية، وكل عبوة عليها رقم تشغيلتها.', 'Authentic Korean and imported brands, every unit with its lot number.')}
        </p>
      </div>
      <ul className="v-brands__track" aria-label={tx('الماركات', 'Brands')}>
        {brands.map((b) => (
          <li key={b.brand}>
            <Link to={`/brand/${brandSlug(b.brand)}`} className="v-bcard">
              <span className="v-bcard__tile">{b.image && <img src={b.image} alt="" loading="lazy" decoding="async" />}</span>
              <span className="v-bcard__name" lang="en">
                {b.brand}
              </span>
              <span className="v-bcard__count">{tx(`${num(b.count)} منتج`, `${num(b.count)} products`)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <SocialIcons className="v-brands__social" />
    </section>
  )
}
