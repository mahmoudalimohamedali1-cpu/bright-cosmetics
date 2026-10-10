import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, Download, PackageOpen, Search, SlidersHorizontal, Tag, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { Badge, Drawer, Empty, Field, PageHeader, Pane, Seg, Tabs, Thumb, useAdmin } from '../ui'
import { daysOfCover, daysUntil, productSales, reorderQty, stock } from '../../lib/metrics'
import { DAY } from '../../lib/rand'
import { originName } from '../../data/catalog'
import type { Batch, Product } from '../../data/types'
import { Forward } from '../parts/core/ui'
import { LEAD_DAYS, SHIPMENT_STATUS, TARGET_DAYS, downloadCSV, incomingUnits, landedLines, today } from '../parts/core/lib'

type Tab = 'stock' | 'expiry' | 'shipments'
type StockFilter = 'all' | 'reorder' | 'low' | 'out'
const REASONS = [
  { id: 'count', ar: 'تصحيح جرد', en: 'Stock count correction' },
  { id: 'damaged', ar: 'تالف أو مكسور', en: 'Damaged or broken' },
  { id: 'tester', ar: 'تستر أو عيّنة', en: 'Tester or sample' },
  { id: 'return', ar: 'مرتجع رجع للمخزون', en: 'Return put back in stock' },
  { id: 'found', ar: 'لقينا قطع زيادة', en: 'Found extra units' },
]

export default function Inventory() {
  const { tx, pick, money, num, date } = useI18n()
  const { toast, staff } = useAdmin()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const products = useStore((s) => s.products)
  const orders = useStore((s) => s.orders)
  const shipments = useStore((s) => s.shipments)
  const settings = useStore((s) => s.settings)
  const { adjustBatch, receiveShipment, log } = useStore.getState()

  const tab = (['stock', 'expiry', 'shipments'].includes(params.get('tab') ?? '') ? params.get('tab') : 'stock') as Tab
  const setTab = (t: Tab) => {
    const p = new URLSearchParams()
    p.set('tab', t)
    setParams(p, { replace: true })
  }
  const [filter, setFilter] = useState<StockFilter>((params.get('filter') as StockFilter) ?? 'all')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [expAll, setExpAll] = useState<'warn' | 'all'>('warn')
  const [open, setOpen] = useState<string | null>(null)
  const [adj, setAdj] = useState<{ p: Product; batchId: string; delta: string; reason: string; err?: string } | null>(null)
  const [writeOff, setWriteOff] = useState<{ p: Product; b: Batch } | null>(null)

  const s30 = useMemo(() => productSales(orders, Date.now() - 30 * DAY), [orders])

  const rows = useMemo(
    () =>
      products
        .filter((p) => p.status !== 'archived')
        .map((p) => {
          const onHand = stock(p)
          const sold = s30.get(p.id)?.units ?? 0
          const cover = daysOfCover(p, s30)
          const incoming = incomingUnits(p.id, shipments)
          const suggest = Math.max(0, reorderQty(p, s30, LEAD_DAYS, TARGET_DAYS) - incoming)
          const state: 'out' | 'low' | 'reorder' | 'ok' = onHand <= 0 ? 'out' : onHand <= p.lowStockAt ? 'low' : cover < LEAD_DAYS ? 'reorder' : 'ok'
          return { p, onHand, sold, cover, incoming, suggest, state }
        }),
    [products, s30, shipments],
  )

  const totals = useMemo(() => {
    let units = 0
    let cost = 0
    let retail = 0
    products.forEach((p) => {
      if (p.status === 'archived') return
      const u = stock(p)
      units += u
      cost += u * p.cost
      retail += u * p.price
    })
    const limit = Date.now() + settings.expiryWarnDays * DAY
    const expiring = products.flatMap((p) => p.batches.filter((b) => b.qty > 0 && new Date(b.expiry).getTime() < limit).map((b) => b.qty * p.cost)).reduce((a, b) => a + b, 0)
    const inbound = shipments.filter((s) => s.status !== 'received').reduce((a, s) => a + s.lines.reduce((x, l) => x + l.qty, 0), 0)
    return { units, cost, retail, expiring, inbound }
  }, [products, shipments, settings.expiryWarnDays])

  const stockRows = useMemo(() => {
    const s = q.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (filter === 'reorder' && r.suggest <= 0) return false
        if (filter === 'low' && r.state !== 'low' && r.state !== 'out') return false
        if (filter === 'out' && r.state !== 'out') return false
        if (s && !`${r.p.name.ar} ${r.p.name.en} ${r.p.brand} ${r.p.sku}`.toLowerCase().includes(s)) return false
        return true
      })
      .sort((a, b) => a.cover - b.cover || a.onHand - b.onHand)
  }, [rows, filter, q])

  const lots = useMemo(() => {
    const limit = Date.now() + settings.expiryWarnDays * DAY
    return products
      .flatMap((p) => p.batches.filter((b) => b.qty > 0 && (expAll === 'all' || new Date(b.expiry).getTime() < limit)).map((b) => ({ p, b, du: daysUntil(b.expiry) })))
      .sort((a, b) => a.b.expiry.localeCompare(b.b.expiry))
  }, [products, expAll, settings.expiryWarnDays])

  const applyAdjust = () => {
    if (!adj) return
    const delta = Number(adj.delta)
    const b = adj.p.batches.find((x) => x.id === adj.batchId)
    if (!adj.delta || !Number.isInteger(delta) || delta === 0) {
      setAdj({ ...adj, err: tx('المطلوب رقم صحيح غير الصفر. السالب للخصم، والموجب للإضافة.', 'Enter a whole number other than 0. Negative removes units, positive adds them.') })
      return
    }
    if (b && b.qty + delta < 0) {
      setAdj({ ...adj, err: tx(`التشغيلة فيها ${num(b.qty)} قطعة بس. أقصى خصم −${num(b.qty)}.`, `This lot only has ${b.qty} units. The most you can remove is −${b.qty}.`) })
      return
    }
    const r = REASONS.find((x) => x.id === adj.reason)!
    adjustBatch(adj.p.id, adj.batchId, delta, r.en)
    log(
      staff,
      { ar: `عدّل مخزون ${adj.p.name.ar} (${delta > 0 ? '+' : ''}${delta}، ${r.ar})`, en: `Adjusted ${adj.p.name.en} stock (${delta > 0 ? '+' : ''}${delta}, ${r.en})` },
      `/admin/products/${adj.p.id}`,
    )
    toast(tx('اتعدّل المخزون', 'Stock adjusted'))
    setAdj(null)
  }

  const doWriteOff = () => {
    if (!writeOff) return
    const { p, b } = writeOff
    adjustBatch(p.id, b.id, -b.qty, 'write-off')
    log(staff, { ar: `شطب ${b.qty} قطعة من ${p.name.ar} (تشغيلة ${b.lot})`, en: `Wrote off ${b.qty} units of ${p.name.en} (lot ${b.lot})` }, `/admin/products/${p.id}`)
    toast(tx(`اتشطب ${num(b.qty)} قطعة`, `Wrote off ${b.qty} units`))
    setWriteOff(null)
  }

  const exportReorder = () => {
    const list = rows.filter((r) => r.suggest > 0)
    downloadCSV(`nuri-reorder-${today()}.csv`, [
      ['SKU', 'Brand', 'Product', 'Origin', 'On hand', 'Units 30d', 'Days of cover', 'Incoming', 'Suggested order', 'Landed cost', 'Est. order cost'],
      ...list.map((r) => [r.p.sku, r.p.brand, r.p.name.en, r.p.origin, r.onHand, r.sold, isFinite(r.cover) ? Math.round(r.cover) : '', r.incoming, r.suggest, r.p.cost, r.suggest * r.p.cost]),
    ])
    toast(tx(`اتصدّرت قائمة شراء بـ${num(list.length)} منتج`, `Exported a purchase list of ${list.length} products`))
  }

  const stateBadge = (s: 'out' | 'low' | 'reorder' | 'ok') =>
    s === 'out' ? (
      <Badge tone="bad">{tx('نفد', 'Out of stock')}</Badge>
    ) : s === 'low' ? (
      <Badge tone="bad">{tx('قليل', 'Low')}</Badge>
    ) : s === 'reorder' ? (
      <Badge tone="warn">{tx('محتاج طلب', 'Reorder now')}</Badge>
    ) : (
      <Badge tone="ok">{tx('كويس', 'Healthy')}</Badge>
    )

  const reorderCount = rows.filter((r) => r.suggest > 0).length
  const expCount = products.reduce((a, p) => a + p.batches.filter((b) => b.qty > 0 && daysUntil(b.expiry) <= settings.expiryWarnDays).length, 0)
  const pendingShip = shipments.filter((s) => s.status !== 'received').length

  return (
    <>
      <PageHeader
        title={tx('المخزون والصلاحية', 'Stock and expiry')}
        description={tx(
          `كل قطعة بتشغيلتها وصلاحيتها. اقتراح الطلب على أساس مدة توريد ${LEAD_DAYS} يوم وتغطية ${TARGET_DAYS} يوم بعد الوصول.`,
          `Every unit by lot and expiry. Reorder suggestions assume a ${LEAD_DAYS}-day lead time and ${TARGET_DAYS} days of cover after arrival.`,
        )}
        actions={
          <button className="btn" onClick={exportReorder} disabled={!reorderCount}>
            <Download size={16} aria-hidden />
            {tx('تصدير قائمة الشراء', 'Export purchase list')}
          </button>
        }
      />

      <div className="stack">
        <div className="ledger" style={{ ['--cols' as string]: 4 }}>
          <button type="button" className="ledger__cell" style={{ textAlign: 'start', border: 0, cursor: 'pointer' }} onClick={() => setTab('stock')}>
            <div className="ledger__label">{tx('قطع في المخزن', 'Units on hand')}</div>
            <div className="ledger__value">{num(totals.units)}</div>
            <div className="ledger__meta">{tx(`${num(rows.length)} منتج، و${num(totals.inbound)} قطعة في الطريق`, `${rows.length} products, ${totals.inbound} units inbound`)}</div>
          </button>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('القيمة بالتكلفة', 'Value at cost')}</div>
            <div className="ledger__value">{money(totals.cost)}</div>
            <div className="ledger__meta">{tx('تكلفة الاستيراد الكاملة', 'Full landed cost')}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('القيمة بسعر البيع', 'Value at retail')}</div>
            <div className="ledger__value">{money(totals.retail)}</div>
            <div className="ledger__meta">{tx(`ربح محتمل ${money(totals.retail - totals.cost)}`, `${money(totals.retail - totals.cost)} potential profit`)}</div>
          </div>
          <button type="button" className="ledger__cell" style={{ textAlign: 'start', border: 0, cursor: 'pointer' }} onClick={() => setTab('expiry')}>
            <div className="ledger__label">{tx(`صلاحيته أقل من ${num(settings.expiryWarnDays)} يوم`, `Expiring within ${settings.expiryWarnDays} days`)}</div>
            <div className="ledger__value" style={{ color: totals.expiring ? 'var(--warn)' : undefined }}>
              {money(totals.expiring)}
            </div>
            <div className="ledger__meta">{tx(`${num(expCount)} تشغيلة، بالتكلفة`, `${expCount} lots, at cost`)}</div>
          </button>
        </div>

        <Pane flush>
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'stock', label: tx('المخزون', 'Stock'), count: reorderCount },
              { value: 'expiry', label: tx('الصلاحية', 'Expiry'), count: expCount },
              { value: 'shipments', label: tx('الشحنات', 'Shipments'), count: pendingShip },
            ]}
          />

          {tab === 'stock' && (
            <>
              <div className="toolbar">
                <div className="input-group" style={{ flex: '1 1 220px', maxWidth: 320 }}>
                  <span className="addon">
                    <Search size={14} aria-hidden />
                  </span>
                  <input className="input core-input-sm" style={{ maxWidth: 'none' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('اسم أو SKU', 'Name or SKU')} aria-label={tx('بحث', 'Search')} />
                </div>
                <Seg<StockFilter>
                  label={tx('فلتر المخزون', 'Stock filter')}
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'all', label: tx('الكل', 'All') },
                    { value: 'reorder', label: tx('محتاج طلب', 'Needs reorder') },
                    { value: 'low', label: tx('قليل', 'Low') },
                    { value: 'out', label: tx('نفد', 'Out') },
                  ]}
                />
              </div>
              {stockRows.length === 0 ? (
                <Empty title={filter === 'all' ? tx('مفيش منتجات بالبحث ده', 'No products match this search') : tx('مفيش منتجات في الحالة دي', 'No products in this state')}>
                  {filter === 'reorder' ? tx('كل المنتجات مغطّية مدة التوريد.', 'Every product covers the supplier lead time.') : undefined}
                </Empty>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{tx('المنتج', 'Product')}</th>
                        <th className="t-end">{tx('في المخزن', 'On hand')}</th>
                        <th className="t-end">{tx('مبيعات 30 يوم', '30-day sales')}</th>
                        <th className="t-end">{tx('أيام التغطية', 'Days of cover')}</th>
                        <th className="t-end">{tx('في الطريق', 'Incoming')}</th>
                        <th className="t-end">{tx('اقتراح الطلب', 'Suggested order')}</th>
                        <th>{tx('الحالة', 'Status')}</th>
                        <th className="core-tight">
                          <span className="sr-only">{tx('تعديل', 'Adjust')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockRows.map((r) => (
                        <tr key={r.p.id}>
                          <td style={{ minWidth: 240 }}>
                            <div className="core-name">
                              <Thumb product={r.p} />
                              <div>
                                <Link to={`/admin/products/${r.p.id}`} className="ellipsis" style={{ display: 'block', maxWidth: 300 }}>
                                  {pick(r.p.name)}
                                </Link>
                                <span className="tiny faint num">{r.p.sku}</span>
                              </div>
                            </div>
                          </td>
                          <td className={`t-num ${r.state === 'out' || r.state === 'low' ? 'core-low' : ''}`}>{num(r.onHand)}</td>
                          <td className="t-num">
                            {num(r.sold)}
                            <div className="tiny faint">{tx(`${num(r.sold / 30, { maximumFractionDigits: 1 })} في اليوم`, `${num(r.sold / 30, { maximumFractionDigits: 1 })} a day`)}</div>
                          </td>
                          <td className="t-num">{isFinite(r.cover) ? <span className={r.cover < LEAD_DAYS ? 'core-low' : undefined}>{num(Math.round(r.cover))}</span> : <span className="faint">—</span>}</td>
                          <td className="t-num">{r.incoming ? <button className="btn btn--ghost btn--sm" onClick={() => setTab('shipments')}>{num(r.incoming)}</button> : <span className="faint">—</span>}</td>
                          <td className="t-num strong">{r.suggest ? num(r.suggest) : <span className="faint">—</span>}</td>
                          <td>{stateBadge(r.state)}</td>
                          <td className="core-tight">
                            <button
                              className="btn btn--sm"
                              disabled={!r.p.batches.length}
                              onClick={() => setAdj({ p: r.p, batchId: [...r.p.batches].sort((a, b) => a.expiry.localeCompare(b.expiry))[0]?.id ?? '', delta: '', reason: 'count' })}
                            >
                              <SlidersHorizontal size={14} aria-hidden />
                              {tx('تعديل', 'Adjust')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'expiry' && (
            <>
              <div className="toolbar">
                <Seg<'warn' | 'all'>
                  label={tx('نطاق الصلاحية', 'Expiry range')}
                  value={expAll}
                  onChange={setExpAll}
                  options={[
                    { value: 'warn', label: tx(`أقل من ${num(settings.expiryWarnDays)} يوم`, `Within ${settings.expiryWarnDays} days`) },
                    { value: 'all', label: tx('كل التشغيلات', 'All lots') },
                  ]}
                />
                <span className="small muted">{tx('مترتبة بالأقرب انتهاءً، وده نفس ترتيب السحب للطلبات', 'Sorted earliest expiry first, the same order lots are picked for orders')}</span>
              </div>
              {lots.length === 0 ? (
                <Empty title={tx('مفيش تشغيلات قربت تنتهي', 'No lots expiring soon')}>{tx(`كل المخزون صلاحيته أكتر من ${num(settings.expiryWarnDays)} يوم.`, `All stock has more than ${settings.expiryWarnDays} days left.`)}</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{tx('المنتج', 'Product')}</th>
                        <th>{tx('التشغيلة', 'Lot')}</th>
                        <th>{tx('الصلاحية', 'Expiry')}</th>
                        <th>{tx('الباقي', 'Time left')}</th>
                        <th className="t-end">{tx('الكمية', 'Qty')}</th>
                        <th className="t-end">{tx('القيمة بالتكلفة', 'Value at cost')}</th>
                        <th className="core-tight">
                          <span className="sr-only">{tx('إجراءات', 'Actions')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.map(({ p, b, du }) => (
                        <tr key={b.id}>
                          <td style={{ minWidth: 220 }}>
                            <div className="core-name">
                              <Thumb product={p} />
                              <Link to={`/admin/products/${p.id}`} className="ellipsis" style={{ maxWidth: 280 }}>
                                {pick(p.name)}
                              </Link>
                            </div>
                          </td>
                          <td className="num">{b.lot}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{date(b.expiry)}</td>
                          <td>
                            {du < 0 ? (
                              <Badge tone="bad">{tx('منتهية، تتشال من البيع', 'Expired, pull from sale')}</Badge>
                            ) : (
                              <Badge tone={du <= 30 ? 'bad' : du <= settings.expiryWarnDays ? 'warn' : 'ok'}>{tx(`${num(du)} يوم`, `${du} days`)}</Badge>
                            )}
                          </td>
                          <td className="t-num">{num(b.qty)}</td>
                          <td className="t-num">{money(b.qty * p.cost)}</td>
                          <td className="core-tight">
                            <div className="row">
                              {du >= 0 && (
                                <button className="btn btn--sm" onClick={() => navigate(`/admin/discounts?new=1&product=${p.id}`)}>
                                  <Tag size={14} aria-hidden />
                                  {tx('عرض ترويجي', 'Promote')}
                                </button>
                              )}
                              <button className="btn btn--sm btn--danger" onClick={() => setWriteOff({ p, b })}>
                                <Trash2 size={14} aria-hidden />
                                {tx('شطب', 'Write off')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'shipments' && (
            <>
              {shipments.length === 0 ? (
                <Empty title={tx('مفيش شحنات استيراد', 'No import shipments')} />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="core-tight">
                          <span className="sr-only">{tx('تفاصيل', 'Details')}</span>
                        </th>
                        <th>{tx('الشحنة', 'Shipment')}</th>
                        <th>{tx('الحالة', 'Status')}</th>
                        <th className="t-end">{tx('القطع', 'Units')}</th>
                        <th className="t-end">{tx('تكلفة البضاعة', 'Goods')}</th>
                        <th className="t-end">{tx('شحن وجمارك', 'Freight and customs')}</th>
                        <th className="t-end">{tx('زيادة على التكلفة', 'Landed uplift')}</th>
                        <th className="core-tight">
                          <span className="sr-only">{tx('استلام', 'Receive')}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...shipments]
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map((s) => {
                          const L = landedLines(s)
                          const st = SHIPMENT_STATUS[s.status]
                          const isOpen = open === s.id
                          return [
                            <tr key={s.id}>
                              <td className="core-tight">
                                <button
                                  className="btn btn--ghost btn--sm btn--icon"
                                  aria-expanded={isOpen}
                                  aria-label={tx('عرض المنتجات', 'Show lines')}
                                  onClick={() => setOpen(isOpen ? null : s.id)}
                                  style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                                >
                                  <ChevronDown size={16} />
                                </button>
                              </td>
                              <td style={{ minWidth: 220 }}>
                                <div className="strong">
                                  <span className="num">{s.id.toUpperCase()}</span> {s.supplier}
                                </div>
                                <div className="tiny faint">
                                  {tx(`من ${pick(originName(s.origin))}، اتطلبت ${date(s.createdAt)}`, `From ${pick(originName(s.origin))}, ordered ${date(s.createdAt)}`)}
                                  {s.arrivedAt && tx(`، وصلت ${date(s.arrivedAt)}`, `, arrived ${date(s.arrivedAt)}`)}
                                </div>
                              </td>
                              <td>
                                <Badge tone={st.tone}>{pick(st)}</Badge>
                              </td>
                              <td className="t-num">{num(L.units)}</td>
                              <td className="t-num">{money(L.goods)}</td>
                              <td className="t-num">
                                {money(L.extras)}
                                {s.status !== 'received' && !s.customs && <div className="tiny faint">{tx('الجمارك لسه ما اتحسبتش', 'Customs not billed yet')}</div>}
                              </td>
                              <td className="t-num">{L.goods ? `+${num((L.extras / L.goods) * 100, { maximumFractionDigits: 1 })}%` : '—'}</td>
                              <td className="core-tight">
                                {s.status !== 'received' ? (
                                  <button
                                    className="btn btn--sm btn--primary"
                                    onClick={() => {
                                      receiveShipment(s.id)
                                      log(staff, { ar: `استلم شحنة ${s.id.toUpperCase()} (${L.units} قطعة)`, en: `Received shipment ${s.id.toUpperCase()} (${L.units} units)` }, '/admin/inventory?tab=shipments')
                                      toast(tx(`اتستلمت الشحنة، واتضاف ${num(L.units)} قطعة كتشغيلات جديدة`, `Shipment received, ${L.units} units added as new lots`))
                                    }}
                                  >
                                    <PackageOpen size={14} aria-hidden />
                                    {tx('استلام', 'Receive')}
                                  </button>
                                ) : (
                                  <span className="tiny faint">{tx('في المخزون', 'In stock')}</span>
                                )}
                              </td>
                            </tr>,
                            isOpen && (
                              <tr key={`${s.id}-lines`} style={{ background: 'var(--pane-2)' }}>
                                <td />
                                <td colSpan={7} style={{ padding: 0 }}>
                                  <table className="table" style={{ background: 'transparent' }}>
                                    <thead>
                                      <tr>
                                        <th>{tx('المنتج', 'Product')}</th>
                                        <th className="t-end">{tx('الكمية', 'Qty')}</th>
                                        <th className="t-end">{tx('سعر الشراء', 'Unit cost')}</th>
                                        <th className="t-end">{tx('التكلفة بعد الشحن والجمارك', 'Landed unit cost')}</th>
                                        <th className="t-end">{tx('التكلفة المسجّلة حاليًا', 'Cost on file')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {L.lines.map((l) => {
                                        const p = products.find((x) => x.id === l.productId)
                                        return (
                                          <tr key={l.productId}>
                                            <td>{p ? <Link to={`/admin/products/${p.id}`}>{pick(p.name)}</Link> : l.productId}</td>
                                            <td className="t-num">{num(l.qty)}</td>
                                            <td className="t-num">{money(l.unitCost)}</td>
                                            <td className="t-num strong">{money(l.landed)}</td>
                                            <td className="t-num muted">{p ? money(p.cost) : '—'}</td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                  <p className="tiny faint" style={{ padding: '8px 12px' }}>
                                    {tx('الشحن والجمارك متوزّعين على المنتجات حسب قيمة كل سطر.', 'Freight and customs are allocated to each line by its share of goods value.')}
                                  </p>
                                </td>
                              </tr>
                            ),
                          ]
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Pane>
        {tab === 'stock' && reorderCount > 0 && filter !== 'reorder' && (
          <button className="btn btn--ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setFilter('reorder')}>
            {tx(`عرض الـ${num(reorderCount)} منتج اللي محتاجين طلب`, `Show the ${reorderCount} products that need reordering`)}
            <Forward />
          </button>
        )}
      </div>

      <Drawer
        open={!!adj}
        onClose={() => setAdj(null)}
        title={adj ? tx(`تعديل مخزون ${adj.p.name.ar}`, `Adjust stock: ${adj.p.name.en}`) : ''}
        footer={
          <>
            <button className="btn" onClick={() => setAdj(null)}>
              {tx('رجوع', 'Cancel')}
            </button>
            <button className="btn btn--primary" onClick={applyAdjust}>
              {tx('حفظ التعديل', 'Save adjustment')}
            </button>
          </>
        }
      >
        {adj && (
          <div className="stack">
            <Field label={tx('التشغيلة', 'Lot')} htmlFor="adj-lot">
              <select id="adj-lot" className="select" value={adj.batchId} onChange={(e) => setAdj({ ...adj, batchId: e.target.value, err: undefined })}>
                {[...adj.p.batches]
                  .sort((a, b) => a.expiry.localeCompare(b.expiry))
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.lot}, {tx(`${b.qty} قطعة، صلاحية ${date(b.expiry)}`, `${b.qty} units, exp ${date(b.expiry)}`)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={tx('التغيير في الكمية', 'Change in quantity')} htmlFor="adj-delta" error={adj.err} hint={tx('مثلًا −2 لقطعتين تالفين، أو 5 لقطع اتلقت', 'For example −2 for two damaged units, or 5 for units found')}>
              <input
                id="adj-delta"
                className="input num"
                type="number"
                step={1}
                value={adj.delta}
                aria-invalid={!!adj.err}
                onChange={(e) => setAdj({ ...adj, delta: e.target.value, err: undefined })}
              />
            </Field>
            <Field label={tx('السبب', 'Reason')} htmlFor="adj-reason">
              <select id="adj-reason" className="select" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })}>
                {REASONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {tx(r.ar, r.en)}
                  </option>
                ))}
              </select>
            </Field>
            {(() => {
              const b = adj.p.batches.find((x) => x.id === adj.batchId)
              const d = Number(adj.delta) || 0
              return b ? (
                <p className="small muted num">
                  {tx(`الكمية: ${num(b.qty)} ← ${num(Math.max(0, b.qty + d))}`, `Quantity: ${b.qty} → ${Math.max(0, b.qty + d)}`)}
                </p>
              ) : null
            })()}
          </div>
        )}
      </Drawer>

      <Drawer
        open={!!writeOff}
        onClose={() => setWriteOff(null)}
        title={tx('شطب التشغيلة؟', 'Write off this lot?')}
        footer={
          <>
            <button className="btn" onClick={() => setWriteOff(null)}>
              {tx('رجوع', 'Cancel')}
            </button>
            <button className="btn btn--danger" onClick={doWriteOff}>
              {tx('شطب', 'Write off')}
            </button>
          </>
        }
      >
        {writeOff && (
          <p className="small">
            {tx(
              `${num(writeOff.b.qty)} قطعة من ${writeOff.p.name.ar} (تشغيلة ${writeOff.b.lot}) هتتشال من المخزون. الخسارة بالتكلفة ${money(writeOff.b.qty * writeOff.p.cost)}.`,
              `${writeOff.b.qty} units of ${writeOff.p.name.en} (lot ${writeOff.b.lot}) will be removed from stock. Loss at cost: ${money(writeOff.b.qty * writeOff.p.cost)}.`,
            )}
          </p>
        )}
      </Drawer>
    </>
  )
}
