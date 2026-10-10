import { Link } from 'react-router-dom'
import { Eye, Heart } from 'lucide-react'
import type { Product } from '../../data/types'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { useUi } from '../lib'
import { Price, Stars } from './bits'

export function ProductCard({ p }: { p: Product }) {
  const { tx, pick } = useI18n()
  const wished = useStore((s) => s.wishlist.includes(p.id))
  const inCart = useStore((s) => s.cart.find((l) => l.productId === p.id)?.qty ?? 0)
  const toggleWish = useStore((s) => s.toggleWish)
  const addToCart = useStore((s) => s.addToCart)
  const setQuickView = useUi((s) => s.setQuickView)
  const stock = stockOf(p)
  const name = pick(p.name)
  const soldOut = stock === 0
  const maxed = inCart >= stock

  return (
    <article className="sf-card">
      <div className="sf-card__pane">
        <Link to={`/p/${p.slug}`} className="sf-card__visual" tabIndex={-1} aria-hidden="true">
          <ProductVisual visual={p.visual} brand={p.brand} size={p.size} />
        </Link>
        <button
          type="button"
          className="sf-card__wish sf-iconbtn"
          aria-pressed={wished}
          aria-label={wished ? tx(`شيلي ${name} من المفضلة`, `Remove ${name} from wishlist`) : tx(`احفظي ${name} في المفضلة`, `Save ${name} to wishlist`)}
          onClick={() => toggleWish(p.id)}
        >
          <Heart size={18} aria-hidden="true" fill={wished ? 'currentColor' : 'none'} />
        </button>
        {soldOut ? (
          <span className="sf-card__flag sf-card__flag--out">{tx('خلصت', 'Sold out')}</span>
        ) : p.compareAt && p.compareAt > p.price ? (
          <span className="sf-card__flag">{tx('سعر مخفّض', 'Reduced')}</span>
        ) : null}
      </div>
      <div className="sf-card__body">
        <p className="sf-card__brand"><bdi>{p.brand}</bdi></p>
        <h3 className="sf-card__name">
          <Link to={`/p/${p.slug}`}>{name}</Link>
        </h3>
        <Stars rating={p.rating} count={p.reviewCount} size={12} />
        <Price price={p.price} compareAt={p.compareAt} />
        <div className="sf-card__actions">
          <button
            type="button"
            className="sf-btn sf-btn--quiet sf-btn--sm"
            disabled={soldOut || maxed}
            onClick={() => addToCart(p.id)}
            aria-label={tx(`أضيفي ${name} للسلة`, `Add ${name} to bag`)}
          >
            {soldOut ? tx('خلصت', 'Sold out') : maxed ? tx('كل الكمية في سلتك', 'All stock in bag') : tx('أضيفي للسلة', 'Add to bag')}
          </button>
          <button
            type="button"
            className="sf-iconbtn sf-iconbtn--line"
            onClick={() => setQuickView(p.id)}
            aria-label={tx(`افتحي نظرة سريعة على ${name}`, `Open quick view of ${name}`)}
          >
            <Eye size={18} aria-hidden="true" />
          </button>
        </div>
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
