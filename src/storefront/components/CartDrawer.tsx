import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { useCartLines } from '../lib'
import { Door } from './Door'
import { Arrow, Stepper } from './bits'

export function FreeShipMeter({ subtotal }: { subtotal: number }) {
  const { tx, money } = useI18n()
  const zone = useStore((s) => s.zones[0])
  const left = Math.max(0, zone.freeOver - subtotal)
  const pct = Math.min(100, (subtotal / zone.freeOver) * 100)
  return (
    <div className="sf-meter" data-done={left === 0 || undefined}>
      <p className="sf-meter__label">
        {left > 0
          ? tx(`فاضلك ${money(left)} وتوصلك ببلاش في ${zone.name.ar}`, `Add ${money(left)} more for free delivery in ${zone.name.en}`)
          : tx(`التوصيل مجاني في ${zone.name.ar}`, `Free delivery in ${zone.name.en}`)}
      </p>
      <div
        className="sf-meter__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={zone.freeOver}
        aria-valuenow={Math.min(subtotal, zone.freeOver)}
        aria-label={tx('التقدم نحو التوصيل المجاني', 'Progress toward free delivery')}
      >
        <span style={{ inlineSize: `${pct}%` }} />
      </div>
    </div>
  )
}

export function CartDrawer() {
  const { tx, pick, money, num } = useI18n()
  const open = useStore((s) => s.cartOpen)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const setQty = useStore((s) => s.setQty)
  const remove = useStore((s) => s.removeFromCart)
  const navigate = useNavigate()
  const { lines, subtotal, count } = useCartLines()
  const close = () => setCartOpen(false)

  return (
    <Door
      open={open}
      onClose={close}
      title={count ? tx(`سلتك (${num(count)})`, `Your bag (${num(count)})`) : tx('سلتك', 'Your bag')}
      footer={
        lines.length ? (
          <div className="sf-cartfoot">
            <div className="sf-cartfoot__row">
              <span>{tx('المجموع', 'Subtotal')}</span>
              <strong className="tabular">{money(subtotal)}</strong>
            </div>
            <p className="sf-cartfoot__fine">{tx('الشحن ورسوم الدفع عند الاستلام بتتحسب في الخطوة الجاية.', 'Delivery and cash-on-delivery fee are added at checkout.')}</p>
            <button
              type="button"
              className="sf-btn sf-btn--lemon sf-btn--block sf-btn--lg"
              onClick={() => {
                close()
                navigate('/checkout')
              }}
            >
              {tx('كمّلي الطلب', 'Checkout')}
              <Arrow />
            </button>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <div className="sf-empty sf-empty--door">
          <p className="sf-empty__title">{tx('سلتك فاضية لسه', 'Your bag is empty')}</p>
          <p className="sf-muted">{tx('ابدئي بخطوة واحدة من روتينك، أو خلّينا نختارلك روتين كامل على نوع بشرتك.', 'Start with one step of your routine, or let us build a full one for your skin type.')}</p>
          <div className="sf-row">
            <Link to="/shop" className="sf-btn sf-btn--quiet" onClick={close}>
              {tx('تسوقي المنتجات', 'Shop products')}
              <Arrow />
            </Link>
            <Link to="/routine" className="sf-textbtn" onClick={close}>
              {tx('اعرفي روتينك', 'Find your routine')}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <FreeShipMeter subtotal={subtotal} />
          <ul className="sf-lines">
            {lines.map(({ product: p, qty }) => {
              const name = pick(p.name)
              return (
                <li key={p.id} className="sf-line">
                  <Link to={`/p/${p.slug}`} className="sf-line__pane sf-lit" onClick={close} tabIndex={-1} aria-hidden="true">
                    <ProductVisual image={p.image} visual={p.visual} brand={p.brand} bare />
                  </Link>
                  <div className="sf-line__info">
                    <div className="sf-line__top">
                      <Link to={`/p/${p.slug}`} className="sf-line__name" onClick={close}>
                        {name}
                      </Link>
                      <strong className="sf-line__price tabular">{money(p.price * qty)}</strong>
                    </div>
                    <p className="sf-card__meta">
                      <bdi dir="ltr">{p.brand} · {p.size}</bdi>
                    </p>
                    <div className="sf-line__ctl">
                      <Stepper value={qty} onChange={(n) => setQty(p.id, n)} max={stockOf(p)} min={1} label={tx(`كمية ${name}`, `Quantity of ${name}`)} />
                      <button type="button" className="sf-iconbtn sf-iconbtn--sm" onClick={() => remove(p.id)} aria-label={tx(`شيلي ${name} من السلة`, `Remove ${name} from bag`)}>
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Door>
  )
}
