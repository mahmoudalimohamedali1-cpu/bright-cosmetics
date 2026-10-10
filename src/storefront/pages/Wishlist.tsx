import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { ProductPanes } from '../components/ProductCard'
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
    <div className="sf-wrap sf-page">
      <header className="sf-shop__head">
        <h1 className="sf-h1">{tx('المفضلة', 'Wishlist')}</h1>
        {list.length > 0 && <p className="sf-muted">{tx(`${num(list.length)} منتج محفوظ`, `${num(list.length)} saved ${list.length === 1 ? 'product' : 'products'}`)}</p>}
      </header>
      {list.length === 0 ? (
        <div className="sf-empty">
          <p className="sf-empty__title">{tx('لسه ما حفظتيش حاجة', 'Nothing saved yet')}</p>
          <p className="sf-muted">{tx('دوسي على القلب في أي منتج وهيستناكي هنا لحد ما تقرري.', 'Tap the heart on any product and it waits here until you decide.')}</p>
          <div className="sf-row">
            <Link to="/shop?sort=best" className="sf-btn sf-btn--lacquer">{tx('شوفي الأكثر مبيعًا', 'See the bestsellers')}</Link>
          </div>
        </div>
      ) : (
        <>
          {addable.length > 1 && (
            <div className="sf-toolbar">
              <button type="button" className="sf-btn sf-btn--quiet" onClick={() => addable.forEach((p) => addToCart(p.id, 1))}>
                {tx(`أضيفي المتوفر للسلة (${num(addable.length)})`, `Add available items to bag (${num(addable.length)})`)}
              </button>
            </div>
          )}
          <ProductPanes products={list} label={tx('المفضلة', 'Wishlist')} />
        </>
      )}
    </div>
  )
}
