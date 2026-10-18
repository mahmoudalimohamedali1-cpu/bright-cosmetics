import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../../i18n'
import type { Category, Product } from '../../../data/types'
import { CATEGORY_LABEL } from '../../../data/catalog'
import { ProductCard } from '../ProductCard'

/* A titled, horizontally scrolling row of product cards with a "see all" link. */
export function ProductRail({
  id,
  title,
  sub,
  products,
  to,
  cta,
  tone,
  children,
}: {
  id: string
  title: string
  sub?: string
  products: Product[]
  to?: string
  cta?: string
  tone?: 'blush'
  children?: ReactNode
}) {
  const { tx } = useI18n()
  if (!products.length) return null
  return (
    <section className={`v-rail ${tone ? `v-rail--${tone}` : ''}`} aria-labelledby={id}>
      <div className="v-wrap v-rail__head">
        <div>
          {title && (
            <h2 id={id} className="v-h2 v-rail__h">
              {title}
            </h2>
          )}
          {sub && <p className="v-rail__sub">{sub}</p>}
        </div>
        {to && (
          <Link to={to} className="v-rail__all">
            {cta || tx('شوفي الكل', 'See all')}
          </Link>
        )}
      </div>
      {children}
      <ul className="v-rail__track" aria-label={title}>
        {products.map((p) => (
          <li key={p.id} className="v-rail__cell">
            <ProductCard p={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* Shop by category: tabs over one rail; only categories the store actually stocks. */
export function CategoryShelf({ products, title, sub }: { products: Product[]; title?: string; sub?: string }) {
  const { tx, pick } = useI18n()
  const cats = useMemo(() => {
    const order: Category[] = ['serum', 'cleanser', 'moisturizer', 'toner', 'eye', 'essence', 'mask', 'hair', 'sunscreen', 'makeup', 'lip']
    return order.filter((c) => products.some((p) => p.category === c))
  }, [products])
  const [cat, setCat] = useState<Category | undefined>(undefined)
  const active = cat ?? cats[0]
  const list = products.filter((p) => p.category === active)
  if (!active) return null
  return (
    <ProductRail
      id="v-cats-h"
      title={title ?? tx('تسوقي حسب القسم.', 'Shop by category.')}
      sub={sub ?? tx('اختاري الخطوة اللي ناقصة روتينك.', 'Pick the step your routine is missing.')}
      products={list}
      to={`/shop/${active}`}
      tone="blush"
    >
      <div className="v-wrap">
        <div className="v-tabs" role="tablist" aria-label={tx('الأقسام', 'Categories')}>
          {cats.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={c === active} className="v-tab" onClick={() => setCat(c)}>
              {pick(CATEGORY_LABEL[c])}
            </button>
          ))}
        </div>
      </div>
    </ProductRail>
  )
}
