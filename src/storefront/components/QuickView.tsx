import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { ProductVisual } from '../../components/ProductVisual'
import { SKIN_LABEL } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { stockOf, useProduct, useStore } from '../../store'
import { fefoBatch, useUi } from '../lib'
import { Door } from './Door'
import { Arrow, Forward, Price, Stars, Stepper } from './bits'

/** Quick view: a sliding door with the essentials and a direct add. */
export function QuickView() {
  const { tx } = useI18n()
  const id = useUi((s) => s.quickView)
  const setQuickView = useUi((s) => s.setQuickView)
  const p = useProduct(id)
  const [last, setLast] = useState(p)
  if (p && p !== last) setLast(p)
  const shown = p ?? last
  return (
    <Door open={!!id} onClose={() => setQuickView(undefined)} title={tx('نظرة سريعة', 'Quick view')} wide>
      {shown && <QuickBody key={shown.id} id={shown.id} />}
    </Door>
  )
}

function QuickBody({ id }: { id: string }) {
  const { tx, pick, date } = useI18n()
  const p = useProduct(id)!
  const wished = useStore((s) => s.wishlist.includes(p.id))
  const inCart = useStore((s) => s.cart.find((l) => l.productId === p.id)?.qty ?? 0)
  const toggleWish = useStore((s) => s.toggleWish)
  const addToCart = useStore((s) => s.addToCart)
  const setQuickView = useUi((s) => s.setQuickView)
  const [qty, setQty] = useState(1)
  const stock = stockOf(p)
  const room = Math.max(0, stock - inCart)
  const lot = fefoBatch(p)
  const name = pick(p.name)

  return (
    <div className="sf-qv">
      <div className="sf-qv__pane sf-lit">
        <ProductVisual image={p.image} visual={p.visual} brand={p.brand} size={p.size} />
      </div>
      <div className="sf-qv__info">
        <p className="sf-card__meta">
          <bdi dir="ltr">{p.brand} · {p.size}</bdi>
        </p>
        <h3 className="sf-qv__name">{name}</h3>
        <Stars rating={p.rating} count={p.reviewCount} />
        <Price price={p.price} compareAt={p.compareAt} big />
        <p className="sf-qv__short">{pick(p.short)}</p>
        <ul className="sf-chips" aria-label={tx('مناسب لبشرة', 'Suits skin types')}>
          {p.skinTypes.map((s) => (
            <li key={s} className="sf-chip sf-chip--fit">
              {pick(SKIN_LABEL[s])}
            </li>
          ))}
        </ul>
        {lot && (
          <p className="sf-lotline">
            {tx('العبوة اللي هتوصلك من تشغيلة', 'Your unit comes from lot')} <span className="sf-mono">{lot.lot}</span>
            {tx('، صالحة لحد ', ', good until ')}
            {date(lot.expiry, { month: 'long', year: 'numeric' })}
          </p>
        )}
        {room > 0 ? (
          <div className="sf-buyrow">
            <Stepper value={Math.min(qty, room)} onChange={setQty} max={room} label={tx('الكمية', 'Quantity')} />
            <button
              type="button"
              className="sf-btn sf-btn--lemon sf-btn--grow"
              data-autofocus
              onClick={() => {
                setQuickView(undefined)
                addToCart(p.id, Math.min(qty, room))
              }}
            >
              {tx('أضيفي للسلة', 'Add to bag')}
              <Arrow />
            </button>
          </div>
        ) : (
          <p className="sf-note">{stock === 0 ? tx('المنتج ده خلص حاليًا.', 'This product is out of stock right now.') : tx('كل الكمية المتاحة في سلتك.', 'All available stock is in your bag.')}</p>
        )}
        <div className="sf-qv__links">
          <button type="button" className="sf-textbtn" aria-pressed={wished} onClick={() => toggleWish(p.id)}>
            <Heart size={16} aria-hidden="true" fill={wished ? 'currentColor' : 'none'} />
            {wished ? tx('محفوظ في المفضلة', 'Saved to wishlist') : tx('احفظيه في المفضلة', 'Save to wishlist')}
          </button>
          <Link className="sf-textbtn" to={`/p/${p.slug}`} onClick={() => setQuickView(undefined)}>
            {tx('شوفي كل التفاصيل', 'See full details')}
            <Forward />
          </Link>
        </div>
      </div>
    </div>
  )
}
