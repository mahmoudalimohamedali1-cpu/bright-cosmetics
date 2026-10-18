import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Concern, HomeBlock, Product, SkinType } from '../../../data/types'
import { bestProducts, heroProducts, pickProducts } from '../../../data/storefront'
import { useI18n } from '../../../i18n'
import { Hero } from '../Hero'
import { ProductCard } from '../ProductCard'
import { Accordion } from './Accordion'
import { AuthSeal, BurstBadge, Pill } from './Glyphs'
import { Marquee } from './Marquee'
import { ScrollFillHeading } from './ScrollFillHeading'
import { SpinBand } from './SpinBand'
import { Testimonials } from './Testimonials'
import { BrandStrip } from './BrandStrip'
import { ProductGroup } from './ProductGroup'
import { CategoryShelf, ProductRail } from './ProductRail'
import { ShapedSection } from './Shapes'
import { useActiveProducts } from '../../lib'

function bySlug(products: Product[], slugs: string[]) {
  return slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => !!p && !!p.image)
}

function routineItems(products: Product[], skin: string, concern: string) {
  const fit = (p: Product) =>
    (!skin || p.skinTypes.includes(skin as SkinType)) && (!concern || p.concerns.includes(concern as Concern))
  const fits = products.filter((p) => p.image && fit(p))
  const byStep = [1, 3, 5].map((s) => fits.find((p) => p.routineStep === s)).filter((p): p is Product => !!p)
  return byStep.length >= 3 ? byStep : fits.slice(0, 3)
}

function spinProduct(products: Product[], slug: string) {
  if (slug) return products.find((p) => p.slug === slug)
  const ranked = [...products].sort((a, b) => b.reviewCount - a.reviewCount)
  return ranked.find((p) => ['toner', 'pump', 'jar', 'tube'].includes(p.visual.shape)) ?? ranked[0]
}

export function Sections({ blocks, hold }: { blocks: HomeBlock[]; hold: number }) {
  const { tx, pick } = useI18n()
  const products = useActiveProducts()
  const best = useMemo(() => bestProducts(products, [], 8), [products])

  return (
    <>
      {blocks.map((block) => {
        if (!block.enabled) return null
        switch (block.type) {
          case 'hero':
            return (
              <Hero
                key={block.id}
                hold={hold}
                headline={pick(block.headline)}
                sub={pick(block.sub)}
                cta={pick(block.cta)}
                href={block.href || '/shop'}
                products={heroProducts(products, block.slugs)}
              />
            )
          case 'bestsellers': {
            const list = bestProducts(products, block.slugs, block.limit)
            if (!list.length) return null
            const title = pick(block.title)
            return (
              <section className="v-best" aria-labelledby={`h-${block.id}`} key={block.id}>
                <div className="v-wrap">
                  {title && <ScrollFillHeading id={`h-${block.id}`} className="v-best__h" text={title} />}
                </div>
                <ul className="v-grid" aria-label={title || tx('الأكثر مبيعًا', 'Bestsellers')}>
                  {list.map((p) => (
                    <li key={p.id} className="v-grid__cell">
                      <ProductCard p={p} />
                    </li>
                  ))}
                </ul>
                {block.href && pick(block.cta) && (
                  <div className="v-center">
                    <Pill to={block.href}>{pick(block.cta)}</Pill>
                  </div>
                )}
              </section>
            )
          }
          case 'rail': {
            const list = pickProducts(products, block)
            return (
              <ProductRail
                key={block.id}
                id={`h-${block.id}`}
                title={pick(block.title)}
                sub={pick(block.sub)}
                products={list}
                to={block.href}
                cta={pick(block.cta)}
                tone={block.tone === 'blush' ? 'blush' : undefined}
              />
            )
          }
          case 'categories':
            return <CategoryShelf key={block.id} products={products} title={pick(block.title)} sub={pick(block.sub)} />
          case 'promises': {
            const shots = bySlug(products, block.slugs)
            const items = block.items
              .map((it) => ({ title: pick(it.title), body: pick(it.body) }))
              .filter((it) => it.title || it.body)
            if (!pick(block.title) && !items.length) return null
            return (
              <section className="v-why" aria-labelledby={`h-${block.id}`} key={block.id}>
                <div className="v-wrap v-why__grid">
                  {shots.length > 0 && (
                    <div className="v-why__photo v-why__photo--products">
                      <ProductGroup products={shots} size="md" />
                    </div>
                  )}
                  <div className="v-why__copy">
                    {pick(block.title) && (
                      <h2 id={`h-${block.id}`} className="v-h2">
                        {pick(block.title)}
                      </h2>
                    )}
                    {items.length > 0 && <Accordion items={items} />}
                  </div>
                </div>
              </section>
            )
          }
          case 'quotes':
            return <Testimonials key={block.id} />
          case 'marquee':
            return pick(block.text) ? (
              <Marquee key={block.id} className="v-strip" items={[pick(block.text)]} label={pick(block.label)} repeat={8} speed={30} />
            ) : null
          case 'spin': {
            const p = spinProduct(products, block.slug)
            return p ? <SpinBand key={block.id} product={p} /> : null
          }
          case 'lot': {
            const star = (block.slug && products.find((p) => p.slug === block.slug)) || best[0]
            if (!star && !pick(block.title)) return null
            const href = block.href || (star ? `/p/${star.slug}` : '/shop')
            return (
              <section className="v-lot" aria-labelledby={`h-${block.id}`} key={block.id}>
                <div className="v-wrap v-lot__grid">
                  <div className="v-lot__art">
                    <AuthSeal className="v-seal" />
                  </div>
                  <div className="v-lot__copy">
                    {pick(block.title) && (
                      <h2 id={`h-${block.id}`} className="v-h2">
                        {pick(block.title)}
                      </h2>
                    )}
                    {pick(block.body) && <p className="v-mono">{pick(block.body)}</p>}
                    {pick(block.cta) && <Pill to={href}>{pick(block.cta)}</Pill>}
                  </div>
                </div>
              </section>
            )
          }
          case 'routines':
            return (
              <section className="v-routines" aria-labelledby={`h-${block.id}`} key={block.id}>
                <div className="v-wrap">
                  {pick(block.title) && (
                    <h2 id={`h-${block.id}`} className="v-h2 v-routines__h">
                      {pick(block.title)}
                    </h2>
                  )}
                  <ul className="v-routines__grid">
                    {block.cards.map((r) => {
                      const items = routineItems(products, r.skin, r.concern)
                      const badge = pick(r.badge)
                      if (!pick(r.title)) return null
                      return (
                        <li key={r.id}>
                          <Link to={r.href || '/shop'} className="v-rcard">
                            <span className="v-rcard__ph v-rcard__ph--products">
                              <ProductGroup products={items} size="sm" />
                              {badge && <BurstBadge className="v-rcard__badge">{badge}</BurstBadge>}
                            </span>
                            <span className="v-rcard__t">{pick(r.title)}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </section>
            )
          case 'brands':
            return <BrandStrip key={block.id} title={pick(block.title)} sub={pick(block.sub)} />
          case 'panel':
            return <ShapedSection key={block.id} block={block} products={products} />
          case 'text': {
            const title = pick(block.title)
            const body = pick(block.body)
            const cta = pick(block.cta)
            if (!title && !body) return null
            return (
              <section className="v-copy" aria-labelledby={title ? `h-${block.id}` : undefined} key={block.id}>
                <div className="v-wrap v-copy__inner">
                  {title && (
                    <h2 id={`h-${block.id}`} className="v-h2">
                      {title}
                    </h2>
                  )}
                  {body && <p className="v-copy__body">{body}</p>}
                  {cta && block.href && <Pill to={block.href}>{cta}</Pill>}
                </div>
              </section>
            )
          }
          default:
            return null
        }
      })}
    </>
  )
}
