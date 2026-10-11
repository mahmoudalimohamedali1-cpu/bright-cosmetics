import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Download, MessageCircle, PackageCheck, Printer, Search, Truck, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { Empty, FulfillmentBadge, PageHeader, Pane, PaymentBadge, Tabs, useAdmin } from '../ui'
import { GOVERNORATES } from '../../data/seed'
import type { Channel, Order, PaymentMethod } from '../../data/types'
import { DAY } from '../../lib/rand'
import { Pager } from '../parts/core/ui'
import { CHANNEL_LABEL, COURIERS, PAYMENT_LABEL, downloadCSV, gov, inView, normalizeView, today, units } from '../parts/core/lib'
import type { Courier, OrderView } from '../parts/core/lib'
import { PackingSlips } from '../parts/core/print'

const PAGE = 50
type DateF = 'any' | 'today' | '7' | '30' | '90' | 'custom'
type Sort = 'new' | 'old' | 'high' | 'low'

export default function Orders() {
  const { tx, pick, money, num, date, relTime } = useI18n()
  const { toast, staff } = useAdmin()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const orders = useStore((s) => s.orders)
  const customers = useStore((s) => s.customers)
  const confirmOrder = useStore((s) => s.confirmOrder)
  const bulkFulfill = useStore((s) => s.bulkFulfill)
  const log = useStore((s) => s.log)

  const view = normalizeView(params.get('view'))
  const [q, setQ] = useState(params.get('q') ?? params.get('code') ?? '')
  const [pay, setPay] = useState<PaymentMethod | ''>((params.get('payment') as PaymentMethod) ?? '')
  const [channel, setChannel] = useState<Channel | ''>((params.get('channel') as Channel) ?? '')
  const [govF, setGovF] = useState(params.get('gov') ?? '')
  const [dateF, setDateF] = useState<DateF>('any')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<Sort>('new')
  const [page, setPage] = useState(0)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [active, setActive] = useState(0)
  const [courier, setCourier] = useState<Courier>('Bosta')
  const [printIds, setPrintIds] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  const tbodyRef = useRef<HTMLTableSectionElement>(null)

  const custById = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])

  const setView = (v: OrderView) => {
    const p = new URLSearchParams(params)
    if (v === 'all') p.delete('view')
    else p.set('view', v)
    setParams(p, { replace: true })
  }

  const counts = useMemo(() => {
    const c: Record<OrderView, number> = { all: 0, confirm: 0, pack: 0, shipped: 0, cod: 0, returns: 0, cancelled: 0 }
    for (const o of orders) (Object.keys(c) as OrderView[]).forEach((v) => inView(o, v) && c[v]++)
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, '')
    let lo = -Infinity
    let hi = Infinity
    if (dateF !== 'any' && dateF !== 'custom') {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      lo = d.getTime() - (dateF === 'today' ? 0 : (Number(dateF) - 1) * DAY)
    }
    if (dateF === 'custom') {
      if (from) lo = new Date(from + 'T00:00:00').getTime()
      if (to) hi = new Date(to + 'T23:59:59').getTime()
    }
    const out = orders.filter((o) => {
      if (!inView(o, view)) return false
      if (pay && o.payment !== pay) return false
      if (channel && o.channel !== channel) return false
      if (govF && o.governorateId !== govF) return false
      const t = new Date(o.createdAt).getTime()
      if (t < lo || t > hi) return false
      if (s) {
        const c = custById.get(o.customerId)
        const hay = `${o.number} ${c?.name.ar ?? ''} ${c?.name.en ?? ''} ${c?.phone ?? ''} ${o.tracking ?? ''} ${o.discountCode ?? ''}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
    out.sort((a, b) =>
      sort === 'new' ? b.createdAt.localeCompare(a.createdAt) : sort === 'old' ? a.createdAt.localeCompare(b.createdAt) : sort === 'high' ? b.total - a.total : a.total - b.total,
    )
    return out
  }, [orders, view, pay, channel, govF, dateF, from, to, q, sort, custById])

  useEffect(() => {
    setPage(0)
    setActive(0)
  }, [view, pay, channel, govF, dateF, from, to, q, sort])

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const filtersOn = !!(q || pay || channel || govF || dateF !== 'any')
  const clearFilters = () => {
    setQ('')
    setPay('')
    setChannel('')
    setGovF('')
    setDateF('any')
    setFrom('')
    setTo('')
    const p = new URLSearchParams(params)
    ;['q', 'code', 'payment', 'channel', 'gov'].forEach((k) => p.delete(k))
    setParams(p, { replace: true })
  }

  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const allOnPage = pageRows.length > 0 && pageRows.every((o) => sel.has(o.id))
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s)
      if (allOnPage) pageRows.forEach((o) => n.delete(o.id))
      else pageRows.forEach((o) => n.add(o.id))
      return n
    })

  // Keyboard: j/k move, x selects, Enter opens, / focuses search
  const stateRef = useRef({ pageRows, active })
  stateRef.current = { pageRows, active }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (t.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      const { pageRows: rows, active: a } = stateRef.current
      if (!rows.length) return
      if (e.key === 'j') setActive(Math.min(rows.length - 1, a + 1))
      else if (e.key === 'k') setActive(Math.max(0, a - 1))
      else if (e.key === 'x') toggle(rows[a].id)
      else if (e.key === 'Enter' && t.tagName !== 'BUTTON' && t.tagName !== 'A') navigate(`/admin/orders/${rows[a].id}`)
      else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
  useEffect(() => {
    tbodyRef.current?.querySelector<HTMLElement>(`tr[data-active="true"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // Print packing slips once the print view has rendered
  useEffect(() => {
    if (!printIds.length) return
    const id = requestAnimationFrame(() => {
      window.print()
      setPrintIds([])
    })
    return () => cancelAnimationFrame(id)
  }, [printIds])

  const selected = orders.filter((o) => sel.has(o.id))
  const canConfirm = selected.filter((o) => o.status === 'open')
  const canPack = selected.filter((o) => o.status !== 'cancelled' && o.fulfillment === 'unfulfilled')
  const canShip = selected.filter((o) => o.status !== 'cancelled' && (o.fulfillment === 'unfulfilled' || o.fulfillment === 'packed'))

  const bulkConfirm = () => {
    canConfirm.forEach((o) => confirmOrder(o.id, 'whatsapp', staff))
    log(staff, { ar: `أكّد ${canConfirm.length} طلب على واتساب`, en: `Confirmed ${canConfirm.length} orders on WhatsApp` }, '/admin/orders')
    toast(tx(`اتأكد ${num(canConfirm.length)} طلب`, `${canConfirm.length} orders confirmed`))
    setSel(new Set())
  }
  const bulkPack = () => {
    bulkFulfill(canPack.map((o) => o.id), 'packed', staff)
    log(staff, { ar: `جهّز ${canPack.length} طلب`, en: `Packed ${canPack.length} orders` }, '/admin/orders?view=pack')
    toast(tx(`اتجهّز ${num(canPack.length)} طلب`, `${canPack.length} orders marked packed`))
    setSel(new Set())
  }
  const bulkShip = () => {
    const ids = new Set(canShip.map((o) => o.id))
    // Assign the chosen courier first; updateFulfillment keeps an existing courier.
    useStore.setState((s) => ({ orders: s.orders.map((o) => (ids.has(o.id) ? { ...o, courier } : o)) }))
    bulkFulfill([...ids], 'shipped', staff)
    log(staff, { ar: `سلّم ${ids.size} طلب لـ${courier}`, en: `Handed ${ids.size} orders to ${courier}` }, '/admin/orders?view=shipped')
    toast(tx(`اتسلّم ${num(ids.size)} طلب لـ${courier}`, `${ids.size} orders handed to ${courier}`))
    setSel(new Set())
  }

  const exportCSV = (list: Order[]) => {
    downloadCSV(`nuri-orders-${today()}.csv`, [
      ['Order', 'Date', 'Customer', 'Phone', 'Governorate', 'Channel', 'Payment method', 'Payment status', 'Fulfillment', 'Status', 'Items', 'Subtotal', 'Discount', 'Shipping', 'COD fee', 'Total', 'Courier', 'Tracking'],
      ...list.map((o) => {
        const c = custById.get(o.customerId)
        return [
          o.number,
          o.createdAt,
          c?.name.en,
          c?.phone,
          gov(o.governorateId)?.name.en,
          o.channel,
          o.payment,
          o.paymentStatus,
          o.fulfillment,
          o.status,
          units(o),
          o.subtotal,
          o.discount,
          o.shipping,
          o.codFee,
          o.total,
          o.courier,
          o.tracking,
        ]
      }),
    ])
    toast(tx(`اتصدّر ${num(list.length)} طلب`, `Exported ${list.length} orders`))
  }

  const tabs: { value: OrderView; label: string; count: number }[] = [
    { value: 'all', label: tx('الكل', 'All'), count: counts.all },
    { value: 'confirm', label: tx('محتاجة تأكيد', 'Needs confirmation'), count: counts.confirm },
    { value: 'pack', label: tx('للتجهيز', 'To pack'), count: counts.pack },
    { value: 'shipped', label: tx('مع شركة الشحن', 'Shipped'), count: counts.shipped },
    { value: 'cod', label: tx('تحصيل عند الاستلام', 'COD to collect'), count: counts.cod },
    { value: 'returns', label: tx('مرتجعات', 'Returns'), count: counts.returns },
    { value: 'cancelled', label: tx('ملغية', 'Cancelled'), count: counts.cancelled },
  ]

  const emptyCopy: Record<OrderView, [string, string]> = {
    all: ['لسه مفيش طلبات', 'No orders yet'],
    confirm: ['كل الطلبات الجديدة اتأكدت', 'Every new order is confirmed'],
    pack: ['مفيش طلبات مستنية تجهيز', 'Nothing waiting to be packed'],
    shipped: ['مفيش طلبات مع شركات الشحن دلوقتي', 'No orders with couriers right now'],
    cod: ['مفيش فلوس مستنية تحصيل', 'No cash waiting to be collected'],
    returns: ['مفيش مرتجعات', 'No returns'],
    cancelled: ['مفيش طلبات ملغية', 'No cancelled orders'],
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={tx('الطلبات', 'Orders')}
          description={tx('تأكيد وتجهيز وشحن وتحصيل، من شاشة واحدة', 'Confirm, pack, ship and collect from one screen')}
          actions={
            <button className="btn" onClick={() => exportCSV(filtered)} disabled={!filtered.length}>
              <Download size={16} aria-hidden />
              {tx('تصدير CSV', 'Export CSV')}
            </button>
          }
        />

        <Pane flush>
          <Tabs<OrderView> value={view} onChange={setView} tabs={tabs} />
          <div className="toolbar">
            <div className="input-group" style={{ flex: '1 1 260px', maxWidth: 360 }}>
              <span className="addon">
                <Search size={14} aria-hidden />
              </span>
              <input
                ref={searchRef}
                className="input core-input-sm"
                style={{ maxWidth: 'none' }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={tx('رقم الطلب أو اسم العميل أو التليفون', 'Order number, customer name or phone')}
                aria-label={tx('بحث في الطلبات', 'Search orders')}
              />
            </div>
            <select className="select core-select-sm" value={pay} onChange={(e) => setPay(e.target.value as PaymentMethod | '')} aria-label={tx('طريقة الدفع', 'Payment method')}>
              <option value="">{tx('كل طرق الدفع', 'All payment methods')}</option>
              {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((k) => (
                <option key={k} value={k}>
                  {pick(PAYMENT_LABEL[k])}
                </option>
              ))}
            </select>
            <select className="select core-select-sm" value={channel} onChange={(e) => setChannel(e.target.value as Channel | '')} aria-label={tx('القناة', 'Channel')}>
              <option value="">{tx('كل القنوات', 'All channels')}</option>
              {(Object.keys(CHANNEL_LABEL) as Channel[]).map((k) => (
                <option key={k} value={k}>
                  {pick(CHANNEL_LABEL[k])}
                </option>
              ))}
            </select>
            <select className="select core-select-sm" value={govF} onChange={(e) => setGovF(e.target.value)} aria-label={tx('المحافظة', 'Governorate')}>
              <option value="">{tx('كل المحافظات', 'All governorates')}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {pick(g.name)}
                </option>
              ))}
            </select>
            <select className="select core-select-sm" value={dateF} onChange={(e) => setDateF(e.target.value as DateF)} aria-label={tx('التاريخ', 'Date')}>
              <option value="any">{tx('أي تاريخ', 'Any date')}</option>
              <option value="today">{tx('النهارده', 'Today')}</option>
              <option value="7">{tx('آخر 7 أيام', 'Last 7 days')}</option>
              <option value="30">{tx('آخر 30 يوم', 'Last 30 days')}</option>
              <option value="90">{tx('آخر 90 يوم', 'Last 90 days')}</option>
              <option value="custom">{tx('فترة مخصّصة', 'Custom range')}</option>
            </select>
            {dateF === 'custom' && (
              <>
                <input type="date" className="input core-input-sm" style={{ width: 150 }} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={tx('من', 'From')} />
                <input type="date" className="input core-input-sm" style={{ width: 150 }} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={tx('إلى', 'To')} />
              </>
            )}
            <select className="select core-select-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={tx('الترتيب', 'Sort')} style={{ marginInlineStart: 'auto' }}>
              <option value="new">{tx('الأحدث أولًا', 'Newest first')}</option>
              <option value="old">{tx('الأقدم أولًا', 'Oldest first')}</option>
              <option value="high">{tx('الأعلى قيمة', 'Highest total')}</option>
              <option value="low">{tx('الأقل قيمة', 'Lowest total')}</option>
            </select>
            {filtersOn && (
              <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
                <X size={14} aria-hidden />
                {tx('مسح الفلاتر', 'Clear filters')}
              </button>
            )}
          </div>

          {sel.size > 0 && (
            <div className="bulkbar" style={{ margin: 12 }}>
              <strong className="num">{tx(`${num(sel.size)} محدد`, `${sel.size} selected`)}</strong>
              {sel.size < filtered.length && (
                <button className="btn btn--sm" onClick={() => setSel(new Set(filtered.map((o) => o.id)))}>
                  {tx(`تحديد الـ${num(filtered.length)} كلهم`, `Select all ${filtered.length}`)}
                </button>
              )}
              <span style={{ flex: 1 }} />
              <button className="btn btn--sm" onClick={bulkConfirm} disabled={!canConfirm.length} title={tx('للطلبات الجديدة بس', 'Applies to new orders only')}>
                <MessageCircle size={14} aria-hidden />
                {tx(`تأكيد على واتساب (${num(canConfirm.length)})`, `Confirm on WhatsApp (${canConfirm.length})`)}
              </button>
              <button className="btn btn--sm" onClick={bulkPack} disabled={!canPack.length}>
                <PackageCheck size={14} aria-hidden />
                {tx(`تجهيز (${num(canPack.length)})`, `Mark packed (${canPack.length})`)}
              </button>
              <select className="select core-select-sm" style={{ minWidth: 110, height: 30 }} value={courier} onChange={(e) => setCourier(e.target.value as Courier)} aria-label={tx('شركة الشحن', 'Courier')}>
                {COURIERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <button className="btn btn--sm" onClick={bulkShip} disabled={!canShip.length}>
                <Truck size={14} aria-hidden />
                {tx(`شحن (${num(canShip.length)})`, `Mark shipped (${canShip.length})`)}
              </button>
              <button className="btn btn--sm" onClick={() => setPrintIds(selected.map((o) => o.id))}>
                <Printer size={14} aria-hidden />
                {tx('طباعة قوائم التعبئة', 'Print packing slips')}
              </button>
              <button className="btn btn--sm" onClick={() => exportCSV(selected)}>
                <Download size={14} aria-hidden />
                CSV
              </button>
              <button className="btn btn--sm btn--icon" onClick={() => setSel(new Set())} aria-label={tx('إلغاء التحديد', 'Clear selection')}>
                <X size={14} />
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            filtersOn ? (
              <Empty
                title={tx('مفيش طلبات بالفلاتر دي', 'No orders match these filters')}
                action={
                  <button className="btn" onClick={clearFilters}>
                    {tx('مسح الفلاتر', 'Clear filters')}
                  </button>
                }
              >
                {tx('البحث برقم الطلب من غير # أو بفترة تاريخ أوسع ممكن يساعد.', 'Try the order number without #, or widen the date range.')}
              </Empty>
            ) : (
              <Empty title={tx(...emptyCopy[view])} />
            )
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="core-tight">
                        <input type="checkbox" className="check" checked={allOnPage} onChange={toggleAll} aria-label={tx('تحديد كل الصفحة', 'Select page')} />
                      </th>
                      <th>{tx('الطلب', 'Order')}</th>
                      <th>{tx('التاريخ', 'Date')}</th>
                      <th>{tx('العميل', 'Customer')}</th>
                      <th>{tx('المحافظة', 'Governorate')}</th>
                      <th className="core-wide-only">{tx('القناة', 'Channel')}</th>
                      <th>{tx('الدفع', 'Payment')}</th>
                      <th>{tx('التجهيز', 'Fulfillment')}</th>
                      <th className="t-end core-wide-only">{tx('القطع', 'Items')}</th>
                      <th className="t-end core-sticky-end">{tx('الإجمالي', 'Total')}</th>
                      <th className="core-tight">
                        <span className="sr-only">{tx('مخاطرة', 'Risk')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody ref={tbodyRef}>
                    {pageRows.map((o, i) => {
                      const c = custById.get(o.customerId)
                      return (
                        <tr
                          key={o.id}
                          className="row-link"
                          data-selected={sel.has(o.id)}
                          data-active={i === active}
                          onClick={() => navigate(`/admin/orders/${o.id}`)}
                        >
                          <td className="core-tight" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="check" checked={sel.has(o.id)} onChange={() => toggle(o.id)} aria-label={tx(`تحديد الطلب ${o.number}`, `Select order ${o.number}`)} />
                          </td>
                          <td>
                            <Link to={`/admin/orders/${o.id}`} className="strong num" onClick={(e) => e.stopPropagation()}>
                              #{o.number}
                            </Link>
                          </td>
                          <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                            <time dateTime={o.createdAt} title={date(o.createdAt, { dateStyle: 'full', timeStyle: 'short' })}>
                              {relTime(o.createdAt)}
                            </time>
                          </td>
                          <td style={{ minWidth: 140 }}>{c ? pick(c.name) : tx('عميل محذوف', 'Deleted customer')}</td>
                          <td className="muted">{pick(gov(o.governorateId)?.name)}</td>
                          <td className="muted core-wide-only">{pick(CHANNEL_LABEL[o.channel])}</td>
                          <td>
                            {o.status === 'cancelled' ? (
                              <span className="badge badge--bad">{tx('ملغي', 'Cancelled')}</span>
                            ) : (
                              <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />
                            )}
                          </td>
                          <td>{o.status === 'open' ? <span className="badge badge--warn">{tx('محتاج تأكيد', 'To confirm')}</span> : <FulfillmentBadge s={o.fulfillment} />}</td>
                          <td className="t-num core-wide-only">{num(units(o))}</td>
                          <td className="t-num strong core-sticky-end">{money(o.total)}</td>
                          <td className="core-tight">
                            {o.risk !== 'low' && (
                              <span
                                className="core-risk"
                                data-level={o.risk}
                                title={o.risk === 'high' ? tx('مخاطرة عالية', 'High risk') : tx('مخاطرة متوسطة', 'Medium risk')}
                                aria-label={o.risk === 'high' ? tx('مخاطرة عالية', 'High risk') : tx('مخاطرة متوسطة', 'Medium risk')}
                              >
                                <AlertTriangle size={16} />
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pager page={page} pageSize={PAGE} total={filtered.length} onPage={(p) => { setPage(p); setActive(0) }} />
              <div className="core-kbd-hint">
                <span>
                  <kbd>j</kbd> <kbd>k</kbd> {tx('تنقّل', 'move')}
                </span>
                <span>
                  <kbd>x</kbd> {tx('تحديد', 'select')}
                </span>
                <span>
                  <kbd>Enter</kbd> {tx('فتح الطلب', 'open order')}
                </span>
                <span>
                  <kbd>/</kbd> {tx('بحث', 'search')}
                </span>
              </div>
            </>
          )}
        </Pane>
      </div>
      {printIds.length > 0 && <PackingSlips orders={orders.filter((o) => printIds.includes(o.id))} />}
    </>
  )
}
