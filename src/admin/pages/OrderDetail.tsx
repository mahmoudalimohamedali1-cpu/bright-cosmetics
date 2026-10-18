import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Ban, Check, CornerDownLeft, ChevronLeft, ChevronRight, MessageCircle, PackageCheck, Phone, Printer, RotateCcw, Truck, Wallet } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { Avatar, Badge, Drawer, Empty, Field, FulfillmentBadge, OrderStatusBadge, PageHeader, Pane, PaymentBadge, Thumb, useAdmin } from '../ui'
import { daysUntil, grossProfit, isCounted, netRevenue } from '../../lib/metrics'
import { ZONES } from '../../data/seed'
import { CHANNEL_LABEL, COURIERS, EVENT_LABEL, PAYMENT_LABEL, gov, waLink } from '../parts/core/lib'
import type { Courier } from '../parts/core/lib'
import { Invoice } from '../parts/core/print'
import '../parts/core/core.css'
import { api, ApiError } from '../../lib/api'
import { applyServerDoc } from '../../lib/sync'
import { useIntegrations } from '../parts/integrations'
import type { Order, Product } from '../../data/types'
import { canCancel, canReturn } from '../../lib/commerce'

const CANCEL_REASONS: { id: string; ar: string; en: string }[] = [
  { id: 'unreachable', ar: 'العميل مش بيرد', en: 'Customer unreachable' },
  { id: 'changed_mind', ar: 'العميل غيّر رأيه', en: 'Customer changed their mind' },
  { id: 'stock', ar: 'المنتج خلص من المخزون', en: 'Item out of stock' },
  { id: 'fraud', ar: 'اشتباه في طلب وهمي', en: 'Suspected fake order' },
  { id: 'duplicate', ar: 'طلب مكرر', en: 'Duplicate order' },
  { id: 'other', ar: 'سبب تاني', en: 'Other reason' },
]

export default function OrderDetail() {
  const { id } = useParams()
  const { tx, pick, money, num, pct, date, relTime, dir } = useI18n()
  const { toast, staff, online, can } = useAdmin()
  const canEdit = can('orders.edit')
  const integrations = useIntegrations()
  const [busy, setBusy] = useState<'bosta' | 'wa' | null>(null)
  const navigate = useNavigate()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  const { confirmOrder, updateFulfillment, cancelOrder, returnOrder, markPaid, refundOrder, addOrderNote, log } = useStore.getState()

  const order = orders.find((o) => o.id === id)
  const [courier, setCourier] = useState<Courier>((order?.courier as Courier) ?? 'Bosta')
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState('')
  const [drawer, setDrawer] = useState<'cancel' | 'refund' | 'return' | null>(null)
  const [retRestock, setRetRestock] = useState(true)
  const [retRefund, setRetRefund] = useState(true)
  const [retNote, setRetNote] = useState('')
  const [stockBusy, setStockBusy] = useState(false)
  const [reason, setReason] = useState('unreachable')
  const [reasonText, setReasonText] = useState('')
  const [reasonErr, setReasonErr] = useState('')

  useEffect(() => {
    if (order?.courier) setCourier(order.courier)
  }, [order?.courier])

  const sorted = useMemo(() => [...orders].sort((a, b) => a.number - b.number), [orders])
  const idx = sorted.findIndex((o) => o.id === id)
  const prevO = idx > 0 ? sorted[idx - 1] : undefined
  const nextO = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : undefined

  const customer = customers.find((c) => c.id === order?.customerId)
  const history = useMemo(() => orders.filter((o) => o.customerId === order?.customerId), [orders, order?.customerId])

  if (!order) {
    return (
      <>
        <PageHeader title={tx('الطلب مش موجود', 'Order not found')} back={{ to: '/admin/orders', label: tx('الطلبات', 'Orders') }} />
        <Pane>
          <Empty
            title={tx('مفيش طلب بالرقم ده', 'There is no order with this ID')}
            action={
              <Link className="btn" to="/admin/orders">
                {tx('الرجوع للطلبات', 'Back to orders')}
              </Link>
            }
          >
            {tx('ممكن يكون اتحذف أو الرابط ناقص. البحث برقم الطلب متاح في قائمة الطلبات.', 'It may have been removed or the link is incomplete. Search by number from the orders list.')}
          </Empty>
        </Pane>
      </>
    )
  }

  const o = order
  const g = gov(o.governorateId)
  const zone = ZONES.find((z) => z.id === g?.zone)
  const cancelled = o.status === 'cancelled'
  const counted = history.filter(isCounted)
  const lifetime = counted.reduce((a, x) => a + netRevenue(x), 0)
  const prevCancels = history.filter((x) => x.id !== o.id && x.status === 'cancelled').length
  const delivered = history.filter((x) => x.id !== o.id && x.fulfillment === 'delivered').length
  const isFirst = !history.some((x) => x.id !== o.id && x.createdAt < o.createdAt)
  const profit = grossProfit(o)
  const cost = o.lines.reduce((a, l) => a + l.cost * l.qty, 0)
  const lineRevenue = o.subtotal - o.discount

  const cname = customer ? pick(customer.name) : tx('العميل', 'Customer')
  const waText = [
    `أهلًا ${customer?.name.ar ?? ''}، معاك فريق برايت.`,
    `بنأكد طلب رقم #${o.number} بإجمالي ${o.total} ج.م ${o.payment === 'cod' ? 'والدفع عند الاستلام' : 'مدفوع مسبقًا'}.`,
    `العنوان: ${o.address}، ${g?.name.ar ?? ''}.`,
    'برجاء الرد بكلمة "تمام" للتأكيد.',
    '',
    `Hi ${customer?.name.en ?? ''}, this is Bright.`,
    `Confirming order #${o.number}, total EGP ${o.total}${o.payment === 'cod' ? ', cash on delivery' : ', prepaid'}.`,
    `Address: ${o.address}, ${g?.name.en ?? ''}.`,
    'Reply OK to confirm.',
  ].join('\n')

  const act = (fn: () => void, ar: string, en: string) => {
    fn()
    log(staff, { ar: `${ar} #${o.number}`, en: `${en} #${o.number}` }, `/admin/orders/${o.id}`)
    toast(tx(ar, en))
  }

  const waApi = online && !!integrations?.whatsapp.configured
  const confirmWA = async () => {
    if (!customer) return
    if (!waApi) {
      window.open(waLink(customer.phone, waText), '_blank', 'noopener')
      act(() => confirmOrder(o.id, 'whatsapp', staff), 'اتأكد الطلب على واتساب', 'Confirmed on WhatsApp')
      return
    }
    setBusy('wa')
    try {
      await api('/api/admin/whatsapp/send', { body: { to: customer.phone, text: waText }, admin: true })
      act(() => confirmOrder(o.id, 'whatsapp', staff), 'اتبعتت رسالة التأكيد على واتساب', 'WhatsApp confirmation sent')
    } catch (e) {
      toast(e instanceof ApiError ? tx(e.bi.ar, e.bi.en) : tx('الرسالة ما اتبعتتش', 'The message was not sent'))
    } finally {
      setBusy(null)
    }
  }
  const bostaReady = online && !!integrations?.bosta.configured
  const createBosta = async () => {
    setBusy('bosta')
    try {
      const r = await api<{ order: Order; rev: number }>(`/api/admin/couriers/bosta/${o.id}`, { body: { by: staff }, admin: true })
      applyServerDoc('orders', r.order, r.rev)
      toast(tx(`اتعملت شحنة بوسطة، رقم التتبع ${r.order.tracking}`, `Bosta delivery created, tracking ${r.order.tracking}`))
    } catch (e) {
      toast(e instanceof ApiError ? tx(e.bi.ar, e.bi.en) : tx('الشحنة ما اتعملتش', 'The delivery was not created'))
    } finally {
      setBusy(null)
    }
  }
  const ship = () => {
    useStore.setState((s) => ({ orders: s.orders.map((x) => (x.id === o.id ? { ...x, courier } : x)) }))
    act(() => updateFulfillment(o.id, 'shipped', staff), `اتسلّم الطلب لـ${courier}`, `Handed to ${courier}`)
  }

  /*
    Cancel and return move stock. With a server, the server does both in one
    transaction (a client-side restock could be lost if the product changed
    meanwhile, e.g. a new order). In demo mode the store does the same locally.
  */
  type StockResult = { order: Order; rev: number; products: { doc: Product; rev: number }[]; lost: { productId: string; qty: number }[] }
  const stockAction = async (path: 'cancel' | 'return', body: Record<string, unknown>, local: () => void, ar: string, en: string) => {
    if (!online) {
      act(local, ar, en)
      setDrawer(null)
      return
    }
    setStockBusy(true)
    try {
      const r = await api<StockResult>(`/api/admin/orders/${o.id}/${path}`, { body, admin: true })
      applyServerDoc('orders', r.order, r.rev)
      for (const p of r.products) applyServerDoc('products', p.doc, p.rev)
      const lost = r.lost.reduce((n, l) => n + l.qty, 0)
      toast(lost ? tx(`${ar}. ${num(lost)} قطعة مالهاش مكان في المخزون (المنتج اتمسح أو مفيش تشغيلات).`, `${en}. ${lost} unit(s) had no stock record to go back to (product deleted or no lots).`) : tx(ar, en))
      setDrawer(null)
    } catch (e) {
      toast(e instanceof ApiError ? tx(e.bi.ar, e.bi.en) : tx('ما اتحفظش، جرّبي تاني.', 'Not saved. Try again.'))
    } finally {
      setStockBusy(false)
    }
  }
  const doCancel = () => {
    const r = CANCEL_REASONS.find((x) => x.id === reason)!
    if (reason === 'other' && !reasonText.trim()) {
      setReasonErr(tx('كتابة السبب مطلوبة عشان يظهر في سجل الطلب.', 'Write the reason so it shows in the order history.'))
      return
    }
    const text = reason === 'other' ? reasonText.trim() : `${r.en} / ${r.ar}`
    void stockAction('cancel', { reason: text }, () => cancelOrder(o.id, text, staff), 'اتلغى الطلب ورجعت القطع للمخزون', 'Order cancelled, items restocked')
  }
  const doReturn = () => {
    const opts = { restock: retRestock, refund: retRefund && o.paymentStatus === 'paid', note: retNote.trim() }
    const ar = opts.restock ? 'اتسجّل المرتجع ورجعت القطع للمخزون' : 'اتسجّل المرتجع'
    const en = opts.restock ? 'Return recorded, items restocked' : 'Return recorded'
    void stockAction('return', opts, () => returnOrder(o.id, opts, staff), ar, en)
  }
  const doRefund = () => {
    act(() => refundOrder(o.id, staff), 'اترد المبلغ', 'Refund recorded')
    setDrawer(null)
  }
  const addNote = () => {
    if (!note.trim()) {
      setNoteErr(tx('الملاحظة فاضية.', 'Write the note first.'))
      return
    }
    addOrderNote(o.id, note.trim(), staff)
    setNote('')
    setNoteErr('')
    toast(tx('اتضافت الملاحظة', 'Note added'))
  }

  /* The one next step for this order — the brass action on this screen. */
  let next: { title: string; hint: string; button: ReactNode } | null = null
  const returned = o.fulfillment === 'returned'
  // A cancelled or returned order has no next step: nothing to pack, ship or collect.
  if (!cancelled && !returned) {
    if (o.status === 'open')
      next = {
        title: tx('تأكيد الطلب مع العميل', 'Confirm the order with the customer'),
        hint: waApi
          ? tx('هيبعت رسالة تأكيد بالعربي والإنجليزي من رقم المتجر على واتساب، ويتسجّل التأكيد في سجل الطلب.', 'Sends a bilingual confirmation from the store’s WhatsApp number and records it in the timeline.')
          : tx('هيفتح واتساب برسالة تأكيد جاهزة بالعربي والإنجليزي، ويتسجّل التأكيد في سجل الطلب.', 'Opens WhatsApp with a ready bilingual confirmation and records it in the timeline.'),
        button: canEdit ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--live" onClick={confirmWA} disabled={!customer || busy === 'wa'} aria-busy={busy === 'wa' || undefined}>
              <MessageCircle size={16} aria-hidden />
              {tx('تأكيد على واتساب', 'Confirm on WhatsApp')}
            </button>
            <button className="btn" onClick={() => act(() => confirmOrder(o.id, 'phone', staff), 'اتأكد الطلب بالتليفون', 'Confirmed by phone')}>
              <Phone size={16} aria-hidden />
              {tx('اتأكد بالتليفون', 'Confirmed by phone')}
            </button>
          </div>
        ) : null,
      }
    else if (o.fulfillment === 'unfulfilled')
      next = {
        title: tx('تجهيز الطلب', 'Pack the order'),
        hint: tx('سحب القطع بالتشغيلات المكتوبة تحت، عشان الأقرب انتهاءً يخرج الأول.', 'Pick the lots listed below so the earliest expiry leaves first.'),
        button: canEdit ? (
          <button className="btn btn--live" onClick={() => act(() => updateFulfillment(o.id, 'packed', staff), 'اتجهّز الطلب', 'Marked packed')}>
            <PackageCheck size={16} aria-hidden />
            {tx('تم التجهيز', 'Mark packed')}
          </button>
        ) : null,
      }
    else if (o.fulfillment === 'packed')
      next = {
        title: tx('تسليم لشركة الشحن', 'Hand to a courier'),
        hint: tx(`التوصيل لـ${pick(g?.name)} بياخد ${zone?.etaDays[0]}–${zone?.etaDays[1]} أيام.`, `Delivery to ${pick(g?.name)} takes ${zone?.etaDays[0]}–${zone?.etaDays[1]} days.`),
        button: canEdit ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 130 }} value={courier} onChange={(e) => setCourier(e.target.value as Courier)} aria-label={tx('شركة الشحن', 'Courier')}>
              {COURIERS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button className="btn btn--live" onClick={ship}>
              <Truck size={16} aria-hidden />
              {tx('شحن', 'Ship')}
            </button>
            <button
              className="btn"
              onClick={createBosta}
              disabled={!bostaReady || busy === 'bosta'}
              aria-busy={busy === 'bosta' || undefined}
              aria-describedby="bosta-why"
              title={bostaReady ? undefined : !online ? tx('محتاج السيرفر', 'Needs the server') : tx('ضبط BOSTA_API_KEY على السيرفر', 'Set BOSTA_API_KEY on the server')}
            >
              {busy === 'bosta' ? tx('بيتعمل…', 'Creating…') : tx('إنشاء شحنة بوسطة', 'Create Bosta delivery')}
            </button>
            {!bostaReady && (
              <span id="bosta-why" className="tiny faint" style={{ flexBasis: '100%' }}>
                {!online
                  ? tx('إنشاء الشحنة أوتوماتيك محتاج السيرفر.', 'Creating the delivery automatically needs the server.')
                  : tx('بوسطة مش متصلة: ضبط BOSTA_API_KEY من الإعدادات ← الربط مع الخدمات.', 'Bosta is not connected: set BOSTA_API_KEY (Settings → Integrations).')}
              </span>
            )}
          </div>
        ) : null,
      }
    else if (o.fulfillment === 'shipped')
      next = {
        title: tx('تأكيد التسليم', 'Confirm delivery'),
        hint:
          o.payment === 'cod'
            ? tx(`تسجيل التسليم بيسجّل تحصيل ${money(o.total)} من ${o.courier ?? 'شركة الشحن'}.`, `Marking delivered records ${money(o.total)} collected via ${o.courier ?? 'the courier'}.`)
            : tx('الطلب مدفوع مسبقًا.', 'This order is prepaid.'),
        button: canEdit ? (
          <button className="btn btn--live" onClick={() => act(() => updateFulfillment(o.id, 'delivered', staff), 'اتسلّم الطلب للعميل', 'Marked delivered')}>
            <Check size={16} aria-hidden />
            {tx('تم التسليم', 'Mark delivered')}
          </button>
        ) : null,
      }
    else if (o.paymentStatus === 'pending')
      next = {
        title: tx('تحصيل المبلغ', 'Collect payment'),
        hint: tx('التحصيل بيتسجّل لما الفلوس توصل من شركة الشحن.', 'Record it once the courier remits the cash.'),
        button: canEdit ? (
          <button className="btn btn--live" onClick={() => act(() => markPaid(o.id, staff), 'اتسجّل التحصيل', 'Payment collected')}>
            <Wallet size={16} aria-hidden />
            {tx('تم التحصيل', 'Mark paid')}
          </button>
        ) : null,
      }
  }

  const factors: { ok: boolean; text: string }[] = []
  if (o.payment === 'cod' && o.total > 3500) factors.push({ ok: false, text: tx(`دفع عند الاستلام بمبلغ كبير (${money(o.total)})`, `Large cash-on-delivery order (${money(o.total)})`) })
  if (isFirst) factors.push({ ok: false, text: tx('أول طلب للعميل ده', 'First order from this customer') })
  if (prevCancels) factors.push({ ok: false, text: tx(`${num(prevCancels)} طلب سابق اتلغى`, `${prevCancels} earlier order(s) cancelled`) })
  if (g?.zone === 'remote') factors.push({ ok: false, text: tx('منطقة بعيدة: توصيل أطول ورفض استلام أعلى', 'Remote area: longer delivery and more refusals') })
  if (o.risk === 'high' && factors.length === 0) factors.push({ ok: false, text: tx('اتعلّم عليه من قاعدة فحص الطلبات', 'Flagged by the order screening rule') })
  if (o.payment !== 'cod') factors.push({ ok: true, text: tx('مدفوع مسبقًا', 'Paid upfront') })
  if (delivered) factors.push({ ok: true, text: tx(`${num(delivered)} طلب سابق اتسلّم بنجاح`, `${delivered} earlier order(s) delivered`) })

  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight
  const events = [...o.events].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ to: '/admin/orders', label: tx('الطلبات', 'Orders') }}
          title={tx(`طلب #${o.number}`, `Order #${o.number}`)}
          description={
            <>
              <span className="core-meta">
                <time dateTime={o.createdAt}>{date(o.createdAt, { dateStyle: 'long', timeStyle: 'short' })}</time>
                <span>{relTime(o.createdAt)}</span>
                <span>{tx(`من ${pick(CHANNEL_LABEL[o.channel])}`, `from ${pick(CHANNEL_LABEL[o.channel])}`)}</span>
              </span>
              <span className="core-badges">
                <OrderStatusBadge s={o.status} />
                {!cancelled && !(returned && o.paymentStatus === 'pending') && <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />}
                {!cancelled && <FulfillmentBadge s={o.fulfillment} />}
              </span>
            </>
          }
          actions={
            <>
              <button className="btn btn--icon" disabled={!prevO} onClick={() => prevO && navigate(`/admin/orders/${prevO.id}`)} aria-label={tx('الطلب السابق', 'Previous order')} title={prevO ? `#${prevO.number}` : undefined}>
                <Prev size={16} />
              </button>
              <button className="btn btn--icon" disabled={!nextO} onClick={() => nextO && navigate(`/admin/orders/${nextO.id}`)} aria-label={tx('الطلب التالي', 'Next order')} title={nextO ? `#${nextO.number}` : undefined}>
                <Next size={16} />
              </button>
              <button className="btn" onClick={() => window.print()}>
                <Printer size={16} aria-hidden />
                {tx('طباعة الفاتورة', 'Print invoice')}
              </button>
              {!cancelled && !returned && o.paymentStatus === 'pending' && o.fulfillment !== 'delivered' && canEdit && (
                <button className="btn" onClick={() => act(() => markPaid(o.id, staff), 'اتسجّل التحصيل', 'Payment collected')}>
                  <Wallet size={16} aria-hidden />
                  {tx('تم التحصيل', 'Mark paid')}
                </button>
              )}
              {o.paymentStatus === 'paid' && can('orders.refund') && (
                <button className="btn" onClick={() => setDrawer('refund')}>
                  <RotateCcw size={16} aria-hidden />
                  {tx('استرداد', 'Refund')}
                </button>
              )}
              {canReturn(o) && can('orders.refund') && (
                <button className="btn" onClick={() => { setRetRestock(true); setRetRefund(true); setRetNote(''); setDrawer('return') }}>
                  <CornerDownLeft size={16} aria-hidden />
                  {tx('تسجيل مرتجع', 'Record return')}
                </button>
              )}
              {canCancel(o) && can('orders.refund') && (
                <button className="btn btn--danger" onClick={() => setDrawer('cancel')}>
                  <Ban size={16} aria-hidden />
                  {tx('إلغاء الطلب', 'Cancel order')}
                </button>
              )}
            </>
          }
        />

        <div className="grid grid-main">
          <div className="stack">
            {next && (
              <Pane>
                <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: '1 1 280px' }}>
                    <div className="strong">{next.title}</div>
                    <div className="small muted">{next.hint}</div>
                  </div>
                  {canEdit && next.button}
                </div>
              </Pane>
            )}

            <Pane
              title={tx(`المنتجات (${num(o.lines.reduce((a, l) => a + l.qty, 0))} قطعة)`, `Items (${o.lines.reduce((a, l) => a + l.qty, 0)} units)`)}
              description={tx('كل سطر بالتشغيلة والصلاحية وتكلفة الاستيراد', 'Each line with its lot, expiry and landed cost')}
              flush
              footer={
                <>
                  <span>{tx(`التكلفة ${money(cost)}`, `Cost ${money(cost)}`)}</span>
                  <span className="strong" style={{ color: 'var(--fg)' }}>
                    {tx(`ربح الطلب ${money(profit)} (${pct(lineRevenue ? profit / lineRevenue : 0, 1)})`, `Order profit ${money(profit)} (${pct(lineRevenue ? profit / lineRevenue : 0, 1)})`)}
                  </span>
                </>
              }
            >
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{tx('المنتج', 'Product')}</th>
                      <th>{tx('التشغيلة', 'Lot')}</th>
                      <th className="t-end">{tx('الكمية × السعر', 'Qty × price')}</th>
                      <th className="t-end">{tx('الإجمالي', 'Total')}</th>
                      <th className="t-end">{tx('التكلفة', 'Cost')}</th>
                      <th className="t-end">{tx('الهامش', 'Margin')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.lines.map((l) => {
                      const p = products.find((x) => x.id === l.productId)
                      const b = p?.batches.find((x) => x.id === l.batchId)
                      const du = b ? daysUntil(b.expiry) : undefined
                      const m = l.price ? (l.price - l.cost) / l.price : 0
                      return (
                        <tr key={l.productId}>
                          <td>
                            <div className="core-name">
                              {p && <Thumb product={p} />}
                              <div>
                                {p ? (
                                  <Link to={`/admin/products/${p.id}`} className="ellipsis" style={{ display: 'block', maxWidth: 280 }}>
                                    {pick(p.name)}
                                  </Link>
                                ) : (
                                  tx('منتج محذوف', 'Deleted product')
                                )}
                                <span className="tiny faint num">
                                  {p?.brand} {p?.sku}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {b ? (
                              <>
                                <span className="num small">{b.lot}</span>
                                <div className="tiny" style={{ color: du !== undefined && du <= settings.expiryWarnDays ? 'var(--warn)' : 'var(--fg-3)' }}>
                                  {tx(`صلاحية ${date(b.expiry)}`, `Exp ${date(b.expiry)}`)}
                                </div>
                              </>
                            ) : (
                              <span className="faint small">{tx('غير مسجّلة', 'Not recorded')}</span>
                            )}
                          </td>
                          <td className="t-num">
                            {num(l.qty)} × {money(l.price)}
                          </td>
                          <td className="t-num strong">{money(l.qty * l.price)}</td>
                          <td className="t-num muted">{money(l.qty * l.cost)}</td>
                          <td className="t-num">
                            {money((l.price - l.cost) * l.qty)}
                            <div className="tiny faint">{pct(m, 0)}</div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Pane>

            <Pane title={tx('الدفع', 'Payment')} actions={(cancelled || returned) && o.paymentStatus === 'pending' ? undefined : <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />}>
              <dl className="core-dl">
                <dt>{tx('طريقة الدفع', 'Method')}</dt>
                <dd>{pick(PAYMENT_LABEL[o.payment])}</dd>
                <dt>{tx('المجموع الفرعي', 'Subtotal')}</dt>
                <dd>{money(o.subtotal)}</dd>
                {o.discount > 0 && (
                  <>
                    <dt>
                      {tx('الخصم', 'Discount')}{' '}
                      {o.discountCode && (
                        <Badge plain tone="hollow">
                          {o.discountCode}
                        </Badge>
                      )}
                    </dt>
                    <dd>−{money(o.discount)}</dd>
                  </>
                )}
                <dt>{tx(`الشحن (${pick(zone?.name)})`, `Shipping (${pick(zone?.name)})`)}</dt>
                <dd>{o.shipping ? money(o.shipping) : tx('مجاني', 'Free')}</dd>
                {o.codFee > 0 && (
                  <>
                    <dt>{tx('رسوم الدفع عند الاستلام', 'COD fee')}</dt>
                    <dd>{money(o.codFee)}</dd>
                  </>
                )}
                <dt className="core-dl__total">{tx('الإجمالي', 'Total')}</dt>
                <dd className="core-dl__total">{money(o.total)}</dd>
                <dt>{o.paymentStatus === 'paid' ? tx('مدفوع', 'Paid') : o.paymentStatus === 'pending' ? (cancelled || returned ? tx('ما اتحصّلش', 'Not collected') : tx('مستحق', 'Due')) : tx('مسترد', 'Refunded')}</dt>
                <dd>{money(o.total)}</dd>
              </dl>
            </Pane>

            <Pane title={tx('سجل الطلب', 'Timeline')}>
              {canEdit && (
                <div className="stack" style={{ gap: 8, marginBottom: 20 }}>
                  <label htmlFor="order-note" className="field__label">
                    {tx('ملاحظة داخلية', 'Internal note')}
                  </label>
                  <textarea
                    id="order-note"
                    className="textarea"
                    style={{ minHeight: 72 }}
                    value={note}
                    aria-invalid={!!noteErr}
                    onChange={(e) => {
                      setNote(e.target.value)
                      if (noteErr) setNoteErr('')
                    }}
                    placeholder={tx('مثلًا: العميل طلب التوصيل بعد الساعة 5', 'For example: customer asked for delivery after 5 pm')}
                  />
                  <div className="row-between">
                    <span className="field__error">{noteErr}</span>
                    <button className="btn btn--sm" onClick={addNote}>
                      {tx('إضافة ملاحظة', 'Add note')}
                    </button>
                  </div>
                </div>
              )}
              <ol className="core-timeline">
                {events.map((e, i) => (
                  <li key={`${e.at}-${i}`} data-kind={e.type === 'note' ? 'note' : e.type === 'cancelled' || e.type === 'returned' ? 'bad' : i === 0 ? 'first' : undefined}>
                    <div className="row-between" style={{ alignItems: 'baseline' }}>
                      <span className="small strong">{pick(EVENT_LABEL[e.type])}</span>
                      <time className="tiny faint" dateTime={e.at} title={date(e.at, { dateStyle: 'full', timeStyle: 'short' })}>
                        {relTime(e.at)}
                      </time>
                    </div>
                    {e.by && <div className="tiny faint">{e.by}</div>}
                    {e.note && <div className="core-note">{e.note}</div>}
                  </li>
                ))}
              </ol>
            </Pane>
          </div>

          <div className="stack">
            <Pane title={tx('العميل', 'Customer')}>
              {customer ? (
                <div className="stack" style={{ gap: 12 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Avatar name={customer.name.en} />
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/admin/customers/${customer.id}`} className="strong">
                        {cname}
                      </Link>
                      <div className="small muted">{pick(gov(customer.governorateId)?.name)}</div>
                    </div>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <a className="btn btn--sm" href={`tel:${customer.phone}`}>
                      <Phone size={14} aria-hidden />
                      <span className="num" dir="ltr">
                        {customer.phone}
                      </span>
                    </a>
                    <a className="btn btn--sm" href={waLink(customer.phone, '')} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={14} aria-hidden />
                      {tx('واتساب', 'WhatsApp')}
                    </a>
                  </div>
                  <dl className="core-dl">
                    <dt>{tx('عدد الطلبات', 'Orders')}</dt>
                    <dd>
                      <Link to={`/admin/customers/${customer.id}`}>{num(counted.length)}</Link>
                    </dd>
                    <dt>{tx('إجمالي الصرف', 'Lifetime spend')}</dt>
                    <dd>{money(lifetime)}</dd>
                    {customer.email && (
                      <>
                        <dt>{tx('الإيميل', 'Email')}</dt>
                        <dd className="ellipsis small">{customer.email}</dd>
                      </>
                    )}
                  </dl>
                </div>
              ) : (
                <p className="muted small">{tx('بيانات العميل مش موجودة.', 'Customer record not found.')}</p>
              )}
            </Pane>

            <Pane title={tx('عنوان الشحن', 'Shipping address')}>
              <div className="stack" style={{ gap: 4 }}>
                <span>{cname}</span>
                <span>{o.address}</span>
                <span>{pick(g?.name)}</span>
                <span className="small muted">
                  {tx(`منطقة ${pick(zone?.name)}، توصيل ${zone?.etaDays[0]}–${zone?.etaDays[1]} أيام`, `${pick(zone?.name)} zone, ${zone?.etaDays[0]}–${zone?.etaDays[1]} day delivery`)}
                </span>
                {o.courier && (
                  <span className="small" style={{ marginTop: 8 }}>
                    {o.courier}
                    {o.tracking && (
                      <>
                        {tx('، رقم التتبع ', ', tracking ')}
                        <span className="num">{o.tracking}</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </Pane>

            <Pane
              title={tx('تقييم المخاطرة', 'Risk assessment')}
              actions={<Badge tone={o.risk === 'high' ? 'bad' : o.risk === 'medium' ? 'warn' : 'ok'}>{o.risk === 'high' ? tx('عالية', 'High') : o.risk === 'medium' ? tx('متوسطة', 'Medium') : tx('منخفضة', 'Low')}</Badge>}
            >
              {factors.length ? (
                <ul className="core-factors">
                  {factors.map((f) => (
                    <li key={f.text}>
                      {f.ok ? <Check size={14} color="var(--ok)" aria-hidden /> : <AlertTriangle size={14} color="var(--warn)" aria-hidden />}
                      {f.text}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small muted">{tx('مفيش إشارات مقلقة.', 'No warning signs.')}</p>
              )}
              <p className="tiny faint" style={{ marginTop: 12 }}>
                {tx('محسوبة من تاريخ العميل وطريقة الدفع والمنطقة.', 'Based on customer history, payment method and area.')}
              </p>
            </Pane>

            {o.note && (
              <Pane title={tx('ملاحظة العميل', 'Customer note')}>
                <p className="small">{o.note}</p>
              </Pane>
            )}
          </div>
        </div>
      </div>

      <Invoice order={o} />

      <Drawer
        open={drawer === 'cancel'}
        onClose={() => setDrawer(null)}
        title={tx(`إلغاء الطلب #${o.number}`, `Cancel order #${o.number}`)}
        footer={
          <>
            <button className="btn" onClick={() => setDrawer(null)}>
              {tx('رجوع', 'Keep order')}
            </button>
            <button className="btn btn--danger" onClick={doCancel} disabled={stockBusy} aria-busy={stockBusy || undefined}>
              {tx('إلغاء الطلب', 'Cancel order')}
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="small muted">
            {tx('القطع هترجع للمخزون في نفس التشغيلة اللي اتسحبت منها، والسبب هيتسجّل في سجل الطلب.', 'Items go back into the lot they were picked from, and the reason is saved in the timeline.')}
          </p>
          <Field label={tx('السبب', 'Reason')} htmlFor="cancel-reason">
            <select id="cancel-reason" className="select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {CANCEL_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {tx(r.ar, r.en)}
                </option>
              ))}
            </select>
          </Field>
          {reason === 'other' && (
            <Field label={tx('السبب بالتفصيل', 'Describe the reason')} htmlFor="cancel-text" error={reasonErr}>
              <textarea
                id="cancel-text"
                className="textarea"
                value={reasonText}
                aria-invalid={!!reasonErr}
                onChange={(e) => {
                  setReasonText(e.target.value)
                  setReasonErr('')
                }}
              />
            </Field>
          )}
          {o.paymentStatus === 'paid' && <p className="small">{tx('الطلب مدفوع، وهيتسجّل كمسترد.', 'This order is paid and will be marked refunded.')}</p>}
        </div>
      </Drawer>

      <Drawer
        open={drawer === 'return'}
        onClose={() => setDrawer(null)}
        title={tx(`مرتجع الطلب #${o.number}`, `Return for order #${o.number}`)}
        footer={
          <>
            <button className="btn" onClick={() => setDrawer(null)}>
              {tx('رجوع', 'Back')}
            </button>
            <button className="btn btn--danger" onClick={doReturn} disabled={stockBusy} aria-busy={stockBusy || undefined}>
              {tx('تسجيل المرتجع', 'Record return')}
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="small muted">
            {o.fulfillment === 'shipped'
              ? tx('الشحنة رجعت قبل التسليم، زي لما العميل يرفض الاستلام.', 'The parcel came back before delivery, for example when the customer refused it.')
              : tx('العميل رجّع الطلب بعد ما استلمه.', 'The customer sent the order back after delivery.')}
          </p>
          <label className="row">
            <input type="checkbox" checked={retRestock} onChange={(e) => setRetRestock(e.target.checked)} />
            {tx(`رجّعي ${num(o.lines.reduce((n, l) => n + l.qty, 0))} قطعة للمخزون (لو سليمة ومقفولة)`, `Put ${o.lines.reduce((n, l) => n + l.qty, 0)} unit(s) back in stock (only if sealed and sellable)`)}
          </label>
          {o.paymentStatus === 'paid' ? (
            <label className="row">
              <input type="checkbox" checked={retRefund} onChange={(e) => setRetRefund(e.target.checked)} />
              {tx(`سجّلي استرداد ${money(o.total)}`, `Record a refund of ${money(o.total)}`)}
            </label>
          ) : (
            <p className="small">{tx('الطلب ما اتدفعش، فمفيش فلوس ترجع.', 'Nothing was paid, so there is nothing to refund.')}</p>
          )}
          <Field label={tx('ملاحظة (اختياري)', 'Note (optional)')} htmlFor="return-note">
            <textarea id="return-note" className="textarea" style={{ minHeight: 64 }} value={retNote} maxLength={300} onChange={(e) => setRetNote(e.target.value)} />
          </Field>
        </div>
      </Drawer>

      <Drawer
        open={drawer === 'refund'}
        onClose={() => setDrawer(null)}
        title={tx(`استرداد الطلب #${o.number}`, `Refund order #${o.number}`)}
        footer={
          <>
            <button className="btn" onClick={() => setDrawer(null)}>
              {tx('رجوع', 'Back')}
            </button>
            <button className="btn btn--danger" onClick={doRefund}>
              {tx(`استرداد ${money(o.total)}`, `Refund ${money(o.total)}`)}
            </button>
          </>
        }
      >
        <p className="small muted">
          {tx(
            `هيتسجّل استرداد المبلغ كامل (${money(o.total)}) بطريقة ${pick(PAYMENT_LABEL[o.payment])}. تحويل الفلوس نفسه بيتم من بوابة الدفع.`,
            `Records a full refund of ${money(o.total)} via ${pick(PAYMENT_LABEL[o.payment])}. The money itself is sent from the payment provider.`,
          )}
        </p>
      </Drawer>
    </>
  )
}
