import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { ProductPanes } from '../components/ProductCard'
import { Arrow, Sticker } from '../components/bits'
import { useTitle } from '../lib'

export default function Wishlist() {
  const { tx, num } = useI18n()
  useTitle(tx('المفضلة', 'Wishlist'))
  const ids = useStore((s) => s.wishlist)
  const products = useStore((s) => s.products)
  const addToCart = useStore((s) => s.addToCart)
  const cart = useStore((s) => s.cart)
  const list = useMemo(() => ids.map((id) => products.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p && p.status === 'active'), [ids, products])
  const addable = list.filter((p) => stockOf(p) > (cart.find((l) => l.productId === p.id)?.qty ?? 0))

  return (
    <div className="sf-page sf-page--flush">
      <div className="sf-wrap">
        <header className="sf-pagehead">
          <h1 className="sf-display">{tx('المفضلة', 'Wishlist')}</h1>
          {list.length > 0 && <p className="sf-count">{tx(`${num(list.length)} منتج محفوظ`, `${num(list.length)} saved ${list.length === 1 ? 'item' : 'items'}`)}</p>}
        </header>
        {list.length > 0 && addable.length > 1 && (
          <div className="sf-toolbar">
            <button type="button" className="sf-btn sf-btn--quiet" onClick={() => addable.forEach((p) => addToCart(p.id, 1))}>
              {tx(`أضيفي المتوفر للسلة (${num(addable.length)})`, `Add available items to bag (${num(addable.length)})`)}
            </button>
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <div className="sf-wrap">
          <div className="sf-empty">
            <Sticker size={96}>
              <Heart size={30} aria-hidden="true" />
            </Sticker>
            <p className="sf-empty__title">{tx('لسه ما حفظتيش حاجة', 'Nothing saved yet')}</p>
            <p className="sf-muted">{tx('دوسي على القلب في أي منتج وهيستناكي هنا لحد ما تقرري.', 'Tap the heart on any product and it waits here until you decide.')}</p>
            <div className="sf-row">
              <Link to="/shop?sort=best" className="sf-btn sf-btn--quiet">
                {tx('شوفي الأكثر مبيعًا', 'See the bestsellers')}
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <ProductPanes products={list} label={tx('المفضلة', 'Wishlist')} />
      )}
    </div>
  )
}
