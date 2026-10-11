import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GOVERNORATES } from '../../data/seed'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { useStore, zoneFor } from '../../store'
import { useTitle } from '../lib'
import { refreshOrder, useRemote } from '../../lib/sync'
import { Check } from 'lucide-react'
import { Arrow, Forward, Sticker } from '../components/bits'

export default function OrderConfirmation() {
  const { id } = useParams()
  const { tx, pick, money, num, date } = useI18n()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const products = useStore((s) => s.products)
  const customer = useStore((s) => s.customers.find((c) => c.id === order?.customerId))
  const zones = useStore((s) => s.zones)
  const settings = useStore((s) => s.settings)
  const online = useRemote((r) => r.online === true)
  const myPhone = useStore((s) => s.customers.find((c) => c.id === s.me)?.phone)
  // Back from a payment page, or a fresh browser: ask the server for the latest status.
  const stale = !order || order.paymentStatus === 'pending'
  useEffect(() => {
    if (online && stale && id && myPhone) void refreshOrder(id, myPhone)
  }, [online, stale, id, myPhone])
  useTitle(order ? tx(`طلب رقم ${order.number}`, `Order ${order.number}`) : tx('الطلب', 'Order'))

  if (!order) {
    return (
      <div className="sf-wrap sf-page">
        <div className="sf-empty">
          <h1 className="sf-h1">{tx('مش لاقيين الطلب ده', 'We cannot find this order')}</h1>
          <p className="sf-muted">{tx('ممكن تدوّري على طلباتك برقم موبايلك من صفحة حسابي.', 'You can look up your orders by mobile number on your account page.')}</p>
          <div className="sf-row">
            <Link to="/account" className="sf-btn sf-btn--quiet">{tx('دوّري على طلبك', 'Find your order')}<Arrow /></Link>
            <Link to="/shop" className="sf-textbtn">{tx('كمّلي تسوّق', 'Keep shopping')}</Link>
          </div>
        </div>
      </div>
    )
  }

  const zone = zoneFor(order.governorateId, zones)
  const gov = GOVERNORATES.find((g) => g.id === order.governorateId)
  const placed = new Date(order.createdAt)
  const eta = (d: number) => {
    const t = new Date(placed)
    t.setDate(t.getDate() + d)
    return t
  }
  const from = eta(zone.etaDays[0])
  const to = eta(zone.etaDays[1])
  const firstName = (customer ? pick(customer.name) : '').split(' ')[0]
  const cod = order.payment === 'cod'
  const fmt = { weekday: 'long', day: 'numeric', month: 'long' } as const

  const next = [
    {
      title: cod ? tx('تأكيد على واتساب', 'WhatsApp confirmation') : tx('تأكيد الطلب', 'Order confirmation'),
      body: cod
        ? tx(
            `${settings.autoConfirmWhatsapp ? 'هتوصلك رسالة واتساب' : 'هنكلّمك'} على ${customer?.phone ?? ''} نأكد الطلب والعنوان.`,
            `${settings.autoConfirmWhatsapp ? 'You get a WhatsApp message' : 'We call you'} at ${customer?.phone ?? ''} to confirm the order and address.`,
          )
        : order.paymentStatus === 'paid'
        ? online
          ? tx('الدفع وصل، والطلب داخل التجهيز على طول.', 'Payment received, so the order goes straight to packing.')
          : tx('الدفع اتسجّل (تجريبي)، والطلب داخل التجهيز على طول.', 'Payment is recorded (demo), so the order goes straight to packing.')
        : tx(`الدفع لسه ما اتأكدش. هنكلّمك على ${customer?.phone ?? ''} نرتّب الدفع ونأكد الطلب.`, `Payment is not confirmed yet. We contact you at ${customer?.phone ?? ''} to arrange payment and confirm the order.`),
    },
    {
      title: tx('التجهيز', 'Packing'),
      body: tx('بنجهّز كل منتج من أقرب تشغيلة في الصلاحية، ورقم التشغيلة مكتوب تحت قدام كل منتج.', 'Each item is picked from its earliest-expiring lot; the lot numbers are listed with your items.'),
    },
    {
      title: tx('التسليم لشركة الشحن', 'Courier handoff'),
      body: tx('أول ما الطلب يتشحن هيوصلك رقم تتبّع، وتقدري تتابعيه من صفحة حسابي.', 'Once it ships you get a tracking number, and you can follow it from your account page.'),
    },
    {
      title: tx('الاستلام', 'Delivery'),
      body: tx(
        `متوقع يوصل بين ${date(from, fmt)} و${date(to, fmt)}.${cod ? ` جهّزي ${money(order.total)} للمندوب.` : ''}`,
        `Expected between ${date(from, fmt)} and ${date(to, fmt)}.${cod ? ` Have ${money(order.total)} ready for the courier.` : ''}`,
      ),
    },
  ]

  return (
    <div className="sf-wrap sf-page sf-confirm">
      <header className="sf-confirm__head">
        <Sticker className="sf-confirm__sticker" size={132}>
          <Check size={44} strokeWidth={2.25} aria-hidden="true" />
        </Sticker>
        <h1 className="sf-display">
          {firstName ? (
            <>
              {tx('اتطلب يا ', 'It’s ordered, ')}
              <bdi>{firstName}</bdi>!
            </>
          ) : (
            tx('اتطلب!', 'It’s ordered!')
          )}
        </h1>
        <p className="sf-confirm__num">
          {tx('طلب رقم', 'Order')} <span className="sf-mono">{order.number}</span>
        </p>
        <p className="sf-confirm__lede">
          {tx(`اتسجّل ${date(order.createdAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}، والتوصيل لـ ${gov ? gov.name.ar : ''}.`, `Placed ${date(order.createdAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, delivering to ${gov ? gov.name.en : ''}.`)}
        </p>
      </header>

      <div className="sf-confirm__grid">
        <section aria-labelledby="h-next">
          <h2 id="h-next" className="sf-formh">{tx('اللي هيحصل بعد كده', 'What happens next')}</h2>
          <ol className="sf-next">
            {next.map((n, i) => (
              <li key={i} className="sf-next__item">
                <span className="sf-next__n" aria-hidden="true">{num(i + 1, { minimumIntegerDigits: 2 })}</span>
                <span>
                  <span className="sf-next__title">{n.title}</span>
                  <span className="sf-next__body">{n.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="sf-confirm__order" aria-labelledby="h-items">
          <h2 id="h-items" className="sf-formh">{tx('طلبك', 'Your order')}</h2>
          <ul className="sf-summary__lines">
            {order.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId)
              const b = p?.batches.find((x) => x.id === l.batchId)
              if (!p) return null
              return (
                <li key={l.productId} className="sf-summary__line">
                  <span className="sf-summary__pane sf-lit" aria-hidden="true">
                    <ProductVisual image={p.image} visual={p.visual} brand={p.brand} bare />
                    <span className="sf-summary__qty">{num(l.qty)}</span>
                  </span>
                  <span className="sf-summary__name">
                    <span className="sf-card__brand"><bdi>{p.brand}</bdi></span>
                    <Link to={`/p/${p.slug}`}>{pick(p.name)}</Link>
                    <span className="sr-only">{tx(`، الكمية ${num(l.qty)}`, `, quantity ${num(l.qty)}`)}</span>
                    {b && (
                      <span className="sf-small sf-muted">
                        {tx('تشغيلة', 'Lot')} <span className="sf-mono">{b.lot}</span>
                        {tx('، صالحة لحد ', ', good until ')}
                        {date(b.expiry, { month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </span>
                  <span className="tabular">{money(l.price * l.qty)}</span>
                </li>
              )
            })}
          </ul>
          <dl className="sf-totals">
            <div>
              <dt>{tx('المنتجات', 'Items')}</dt>
              <dd className="tabular">{money(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="sf-totals__save">
                <dt>{tx(`خصم ${order.discountCode ?? ''}`, `Discount ${order.discountCode ?? ''}`)}</dt>
                <dd className="tabular">−{money(order.discount)}</dd>
              </div>
            )}
            <div>
              <dt>{tx('الشحن', 'Delivery')}</dt>
              <dd className="tabular">{order.shipping ? money(order.shipping) : tx('مجاني', 'Free')}</dd>
            </div>
            {order.codFee > 0 && (
              <div>
                <dt>{tx('رسوم الدفع عند الاستلام', 'Cash on delivery fee')}</dt>
                <dd className="tabular">{money(order.codFee)}</dd>
              </div>
            )}
            <div className="sf-totals__total">
              <dt>{cod ? tx('هتدفعي عند الاستلام', 'Pay on delivery') : online ? tx('الإجمالي', 'Total') : tx('الإجمالي (تجريبي)', 'Total (demo)')}</dt>
              <dd className="tabular">{money(order.total)}</dd>
            </div>
          </dl>
          <p className="sf-small sf-muted">{order.address}</p>
        </section>
      </div>

      <div className="sf-row sf-confirm__actions">
        <Link to="/shop" className="sf-btn sf-btn--quiet">
          {tx('كمّلي تسوّق', 'Keep shopping')}
          <Arrow />
        </Link>
        <Link to="/account" className="sf-textbtn">
          {tx('تابعي طلباتك', 'Follow your orders')}
          <Forward />
        </Link>
      </div>
    </div>
  )
}
