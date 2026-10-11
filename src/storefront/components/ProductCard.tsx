import { Link } from 'react-router-dom'
import { Eye, Heart, Plus } from 'lucide-react'
import type { Product } from '../../data/types'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { useUi } from '../lib'
import { Price, Stars, Sticker } from './bits'

/*
  One cell of the hairline product grid: the product on cream, then its name
  in the display serif with the price at the inline end, then one mono line.
  The name link stretches over the whole cell; the buttons sit above it.
*/
export function ProductCard({ p }: { p: Product }) {
  const { tx, pick, num } = useI18n()
  const wished = useStore((s) => s.wishlist.includes(p.id))
  const inCart = useStore((s) => s.cart.find((l) => l.productId === p.id)?.qty ?? 0)
  const toggleWish = useStore((s) => s.toggleWish)
  const addToCart = useStore((s) => s.addToCart)
  const setQuickView = useUi((s) => s.setQuickView)
  const stock = stockOf(p)
  const name = pick(p.name)
  const soldOut = stock === 0
  const maxed = inCart >= stock
  const sale = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0
  const best = p.tags.includes('bestseller')

  return (
    <article className="sf-card" data-soldout={soldOut || undefined}>
      <div className="sf-card__tile">
        <span className="sf-card__visual" aria-hidden="true">
          <ProductVisual visual={p.visual} brand={p.brand} size={p.size} />
        </span>
        {!soldOut && (sale > 0 || best) && (
          <Sticker className="sf-card__sticker" size={68}>
            {sale > 0 ? tx(`خصم ${num(sale)}٪`, `${num(sale)}% off`) : tx('الأكتر مبيعًا', 'Best seller')}
          </Sticker>
        )}
        {soldOut && <span className="sf-card__flag">{tx('خلصت', 'Sold out')}</span>}
        <button
          type="button"
          className="sf-card__wish sf-iconbtn sf-iconbtn--sm"
          aria-pressed={wished}
          aria-label={wished ? tx(`شيلي ${name} من المفضلة`, `Remove ${name} from wishlist`) : tx(`احفظي ${name} في المفضلة`, `Save ${name} to wishlist`)}
          onClick={() => toggleWish(p.id)}
        >
          <Heart size={16} aria-hidden="true" fill={wished ? 'currentColor' : 'none'} />
        </button>
        <div className="sf-card__quick">
          <button
            type="button"
            className="sf-btn sf-btn--quiet sf-btn--sm"
            disabled={soldOut || maxed}
            onClick={() => addToCart(p.id)}
            aria-label={soldOut ? tx(`${name} خلصت`, `${name} is sold out`) : maxed ? tx(`كل كمية ${name} في سلتك`, `All stock of ${name} is in your bag`) : tx(`أضيفي ${name} للسلة`, `Add ${name} to bag`)}
          >
            {!soldOut && !maxed && <Plus size={14} aria-hidden="true" />}
            {soldOut ? tx('خلصت', 'Sold out') : maxed ? tx('كلها في سلتك', 'All in bag') : tx('أضيفي', 'Add')}
          </button>
          <button
            type="button"
            className="sf-iconbtn sf-iconbtn--sm sf-card__peek"
            onClick={() => setQuickView(p.id)}
            aria-label={tx(`افتحي نظرة سريعة على ${name}`, `Open quick view of ${name}`)}
          >
            <Eye size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="sf-card__body">
        <div className="sf-card__line">
          <h3 className="sf-card__name">
            <Link to={`/p/${p.slug}`}>{name}</Link>
          </h3>
          <Price price={p.price} compareAt={p.compareAt} />
        </div>
        <p className="sf-card__meta">
          <bdi dir="ltr">{p.brand} · {p.size}</bdi>
        </p>
        <Stars rating={p.rating} count={p.reviewCount} size={11} />
      </div>
    </article>
  )
}

export function ProductPanes({ products, label }: { products: Product[]; label?: string }) {
  return (
    <ul className="sf-panes" aria-label={label}>
      {products.map((p) => (
        <li key={p.id} className="sf-panes__cell">
          <ProductCard p={p} />
        </li>
      ))}
    </ul>
  )
}
