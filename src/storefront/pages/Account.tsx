import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Order, OrderEvent } from '../../data/types'
import { useI18n } from '../../i18n'
import { fetchHistory, useRemote } from '../../lib/sync'
import { useStore } from '../../store'
import { PHONE_RE, normalizePhone, useTitle, westernDigits } from '../lib'
import { Arrow } from '../components/bits'

const FLOW: OrderEvent['type'][] = ['placed', 'confirmed', 'packed', 'shipped', 'delivered']

export default function Account() {
  const { tx, pick } = useI18n()
  useTitle(tx('حسابي', 'My account'))
  const online = useRemote((s) => s.online)
  const me = useStore((s) => s.customers.find((c) => c.id === s.me))
  const orders = useStore((s) => s.orders)
  const [phone, setPhone] = useState('')
  const [orderNo, setOrderNo] = useState('')
  const [found, setFound] = useState<Order[] | undefined>()
  const [err, setErr] = useState<{ field: 'phone' | 'order'; text: string } | undefined>()
  const [busy, setBusy] = useState(false)

  const mine = useMemo(() => (me ? orders.filter((o) => o.customerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [me, orders])

  // With a server, "My orders" comes from there: current statuses, and orders placed on other devices too.
  useEffect(() => {
    if (!online || !me) return
    const latest = useStore.getState().orders.filter((o) => o.customerId === me.id).sort((a, b) => b.number - a.number)[0]
    if (latest) void fetchHistory(me.phone, latest.number)
  }, [online, me])

  const lookup = async (e: FormEvent) => {
    e.preventDefault()
    const ph = normalizePhone(phone)
    const n = Number(westernDigits(orderNo).replace(/\D/g, ''))
    if (!PHONE_RE.test(ph)) {
      setErr({ field: 'phone', text: tx('اكتبي موبايل مصري من ١١ رقم يبدأ بـ 010 أو 011 أو 012 أو 015.', 'Enter an 11-digit Egyptian mobile starting with 010, 011, 012 or 015.') })
      return
    }
    if (!n) {
      setErr({ field: 'order', text: tx('اكتبي رقم أي طلب من طلباتك. موجود في رسالة التأكيد.', 'Enter the number of any of your orders. It is in your confirmation message.') })
      return
    }
    setErr(undefined)
    if (online) {
      setBusy(true)
      const list = await fetchHistory(ph, n)
      setBusy(false)
      setFound(list ?? [])
      return
    }
    // Demo mode: the same check against this browser's data.
    const s = useStore.getState()
    const c = s.customers.find((x) => x.phone === ph)
    const owns = c && s.orders.some((o) => o.customerId === c.id && o.number === n)
    setFound(owns ? s.orders.filter((o) => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [])
  }

  return (
    <div className="sf-wrap sf-page sf-account">
      <header className="sf-pagehead">
        <h1 className="sf-display">{me ? tx(`أهلًا يا ${pick(me.name).split(' ')[0]}`, `Hello, ${pick(me.name).split(' ')[0]}`) : tx('تابعي طلبك', 'Track your order')}</h1>
        <p className="sf-pagehead__lede">
          {me
            ? tx('دي طلباتك. مفيش باسورد، الحساب مربوط برقم موبايلك.', 'These are your orders. No password: your account follows your mobile number.')
            : tx('اكتبي رقم الموبايل اللي طلبتي بيه ورقم أي طلب، ونعرضلك كل طلباتك وحالتها.', 'Enter the mobile you ordered with and any order number to see all your orders and their status.')}
        </p>
      </header>

      {me && (
        <section aria-labelledby="h-mine" className="sf-account__sec">
          <h2 id="h-mine" className="sf-formh">{tx('طلباتي', 'My orders')}</h2>
          {mine.length ? <OrderList orders={mine} /> : <p className="sf-muted">{tx('لسه مفيش طلبات.', 'No orders yet.')}</p>}
        </section>
      )}

      <section aria-labelledby="h-lookup" className="sf-account__sec">
        <h2 id="h-lookup" className="sf-formh">{me ? tx('دوّري على طلبات رقم تاني', 'Look up another number') : tx('دوّري على طلباتك', 'Find your orders')}</h2>
        <form className="sf-lookup sf-lookup--two" onSubmit={lookup} noValidate>
          <div className="sf-lookup__field">
            <label htmlFor="lk-phone" className="sf-lookup__label">{tx('رقم الموبايل', 'Mobile number')}</label>
            <input
              id="lk-phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              placeholder="01X XXXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={err?.field === 'phone' || undefined}
              aria-describedby={err?.field === 'phone' ? 'lk-err' : undefined}
            />
          </div>
          <div className="sf-lookup__field sf-lookup__field--short">
            <label htmlFor="lk-order" className="sf-lookup__label">{tx('رقم الطلب', 'Order number')}</label>
            <input
              id="lk-order"
              inputMode="numeric"
              dir="ltr"
              placeholder="1234"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              aria-invalid={err?.field === 'order' || undefined}
              aria-describedby={err?.field === 'order' ? 'lk-err' : undefined}
            />
          </div>
          <button type="submit" className="sf-iconbtn sf-lookup__go" aria-label={tx('اعرضي الطلبات', 'Show orders')} disabled={busy} aria-busy={busy || undefined}>
            <Arrow size={20} />
          </button>
        </form>
        {err && <p className="sf-field__err" id="lk-err" role="alert">{err.text}</p>}
        {found && (found.length ? <OrderList orders={found} /> : <p className="sf-muted" role="status">{tx('مفيش طلب بالموبايل ورقم الطلب دول. اتأكدي من الرقمين.', 'No order matches this mobile and order number. Check both.')}</p>)}
      </section>
    </div>
  )
}

function OrderList({ orders }: { orders: Order[] }) {
  const { tx, pick, money, num, date } = useI18n()
  const products = useStore((s) => s.products)
  const label: Record<string, string> = {
    placed: tx('اتسجّل', 'Placed'),
    confirmed: tx('اتأكد', 'Confirmed'),
    packed: tx('اتجهّز', 'Packed'),
    shipped: tx('اتشحن', 'Shipped'),
    delivered: tx('وصل', 'Delivered'),
    cancelled: tx('اتلغى', 'Cancelled'),
    returned: tx('مرتجع', 'Returned'),
  }
  return (
    <ul className="sf-orders">
      {orders.map((o) => {
        const at = (t: OrderEvent['type']) => {
          const ev = o.events.find((e) => e.type === t || (t === 'confirmed' && e.type === 'whatsapp_confirmed'))
          return ev?.at
        }
        const cancelled = o.status === 'cancelled'
        const returned = o.fulfillment === 'returned'
        return (
          <li key={o.id} className="sf-order">
            <div className="sf-order__head">
              <Link to={`/order/${o.id}`} className="sf-order__num">
                {tx(`طلب رقم ${o.number}`, `Order ${o.number}`)}
              </Link>
              <span className="sf-muted sf-small">{date(o.createdAt)}</span>
              <strong className="tabular">{money(o.total)}</strong>
            </div>
            <p className="sf-small sf-muted">
              {o.lines
                .map((l) => {
                  const p = products.find((x) => x.id === l.productId)
                  return p ? `${pick(p.name)} × ${num(l.qty)}` : ''
                })
                .filter(Boolean)
                .join(tx('، ', ', '))}
            </p>
            {cancelled || returned ? (
              <p className="sf-order__status sf-order__status--off">{cancelled ? label.cancelled : label.returned}</p>
            ) : (
              <ol className="sf-timeline" aria-label={tx('حالة الطلب', 'Order status')}>
                {FLOW.map((t) => {
                  const when = at(t) ?? (t === 'confirmed' && (at('packed') || at('shipped')) ? o.createdAt : undefined)
                  return (
                    <li key={t} className="sf-timeline__step" data-done={!!when || undefined}>
                      <span className="sf-timeline__dot" aria-hidden="true" />
                      <span className="sf-timeline__label">{label[t]}</span>
                      {when && <span className="sf-timeline__when">{date(when, { day: 'numeric', month: 'short' })}</span>}
                      {!when && <span className="sr-only">{tx('لسه', 'not yet')}</span>}
                    </li>
                  )
                })}
              </ol>
            )}
            {o.tracking && (
              <p className="sf-small">
                {tx('رقم التتبّع', 'Tracking')} <span className="sf-mono">{o.tracking}</span> {o.courier && `(${o.courier})`}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
