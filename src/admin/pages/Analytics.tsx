import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, Table2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { GOVERNORATES, ZONES } from '../../data/seed'
import { CATEGORY_LABEL } from '../../data/catalog'
import { dailySeries, delta, grossProfit, inRange, isCounted, kpis, netRevenue, rangeFor } from '../../lib/metrics'
import type { Category, Channel, Order, PaymentMethod } from '../../data/types'
import { ChartTip, DemoNote, Delta, PageHeader, Pane, Seg, Switch, Thumb } from '../ui'
import { BarList, LedgerCell, Note, Takeaway } from '../parts/growth'
import { downloadCSV, heat, today } from '../parts/growth/util'

const CHANNEL: Record<Channel, { ar: string; en: string }> = {
  web: { ar: 'المتجر الإلكتروني', en: 'Online store' },
  instagram: { ar: 'إنستجرام', en: 'Instagram' },
  tiktok: { ar: 'تيك توك', en: 'TikTok' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  pos: { ar: 'نقطة البيع', en: 'In person (POS)' },
}
const PAYMENT: Record<PaymentMethod, { ar: string; en: string }> = {
  cod: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  card: { ar: 'بطاقة', en: 'Card' },
  wallet: { ar: 'محفظة موبايل', en: 'Mobile wallet' },
  instapay: { ar: 'إنستاباي', en: 'InstaPay' },
}
// Egyptian week starts on Saturday
const WEEK = [6, 0, 1, 2, 3, 4, 5]

type ProdSort = 'revenue' | 'units' | 'profit' | 'margin' | 'returns'

function ExportBtn({ onClick }: { onClick: () => void }) {
  const { tx } = useI18n()
  return (
    <button className="btn btn--ghost btn--sm" onClick={onClick} aria-label={tx('تصدير CSV', 'Export CSV')}>
      <Download size={14} aria-hidden />
      CSV
    </button>
  )
}

function D({ on, c, p, invert, points }: { on: boolean; c: number; p: number; invert?: boolean; points?: boolean }) {
  const { tx } = useI18n()
  if (!on) return null
  return (
    <>
      <Delta value={points ? c - p : delta(c, p)} invert={invert} suffix={points ? tx('نقطة', 'pts') : undefined} />
      <span>{tx('عن الفترة اللي قبلها', 'vs previous period')}</span>
    </>
  )
}

export default function Analytics() {
  const { tx, pick, money, num, pct, date, dir } = useI18n()
  const orders = useStore((s) => s.orders)
  const customers = useStore((s) => s.customers)
  const products = useStore((s) => s.products)
  const [params, setParams] = useSearchParams()
  const days = [7, 30, 90, 180].includes(Number(params.get('days'))) ? Number(params.get('days')) : 30
  const [compare, setCompare] = useState(true)
  const [geo, setGeo] = useState<'zone' | 'gov'>('zone')
  const [showTable, setShowTable] = useState(false)
  const [prodSort, setProdSort] = useState<ProdSort>('revenue')
  const [prodAll, setProdAll] = useState(false)
  const rtl = dir === 'rtl'

  const cur = rangeFor(days)
  const prev = rangeFor(days, 1)
  const k = useMemo(() => kpis(orders, customers, cur.from, cur.to), [orders, customers, cur.from, cur.to])
  const kp = useMemo(() => kpis(orders, customers, prev.from, prev.to), [orders, customers, prev.from, prev.to])

  const firstOrderAt = useMemo(() => orders.reduce((m, o) => Math.min(m, new Date(o.createdAt).getTime()), Infinity), [orders])
  const canCompare = firstOrderAt <= prev.from + 86400000
  const cmp = compare && canCompare

  const inCur = useMemo(() => orders.filter((o) => inRange(o, cur.from, cur.to)), [orders, cur.from, cur.to])
  const counted = useMemo(() => inCur.filter(isCounted), [inCur])
  const kept = useMemo(() => counted.filter((o) => o.fulfillment !== 'returned'), [counted])

  /* Revenue & profit series (weekly buckets past 30 days) */
  const series = useMemo(() => {
    const d = dailySeries(orders, days)
    if (days <= 30) return d
    const out: typeof d = []
    // Buckets end on today so the latest week is complete; only the first may be partial
    for (let end = d.length; end > 0; end -= 7) {
      const chunk = d.slice(Math.max(0, end - 7), end)
      out.push({
        date: chunk[0].date,
        revenue: chunk.reduce((s, x) => s + x.revenue, 0),
        profit: chunk.reduce((s, x) => s + x.profit, 0),
        orders: chunk.reduce((s, x) => s + x.orders, 0),
        prevRevenue: chunk.reduce((s, x) => s + (x.prevRevenue ?? 0), 0),
      })
    }
    return out.reverse()
  }, [orders, days])
  const bestPoint = series.reduce((b, x) => (x.revenue > b.revenue ? x : b), series[0])
  const weekly = days > 30

  /* Weekday × hour */
  const wh = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
    for (const o of counted) {
      const t = new Date(o.createdAt)
      g[t.getDay()][t.getHours()]++
    }
    const hoursWith = [...Array(24).keys()].filter((h) => g.some((row) => row[h] > 0))
    const lo = hoursWith.length ? Math.min(...hoursWith) : 9
    const hi = hoursWith.length ? Math.max(...hoursWith) : 22
    let peak = { d: 0, h: 0, n: 0 }
    g.forEach((row, d) => row.forEach((n, h) => n > peak.n && (peak = { d, h, n })))
    const dayTotals = g.map((row) => row.reduce((a, b) => a + b, 0))
    return { g, hours: Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), max: Math.max(1, ...g.flat()), peak, dayTotals }
  }, [counted])
  const dayName = (d: number, long = false) => {
    const ref = new Date(2024, 0, 7 + d) // 7 Jan 2024 was a Sunday
    return date(ref, { weekday: long ? 'long' : 'short' })
  }
  const hourName = (h: number) => date(new Date(2024, 0, 1, h), { hour: 'numeric' })

  /* Group helper */
  const groupBy = <K extends string>(list: Order[], key: (o: Order) => K) => {
    const m = new Map<K, { orders: number; revenue: number; profit: number }>()
    for (const o of list) {
      const kk = key(o)
      const e = m.get(kk) ?? { orders: 0, revenue: 0, profit: 0 }
      e.orders++
      e.revenue += netRevenue(o)
      e.profit += grossProfit(o)
      m.set(kk, e)
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v, aov: v.orders ? v.revenue / v.orders : 0 })).sort((a, b) => b.revenue - a.revenue)
  }

  const channels = useMemo(() => groupBy(kept, (o) => o.channel), [kept])
  const totalRev = kept.reduce((s, o) => s + netRevenue(o), 0)
  const topCh = channels[0]
  const bestAovCh = [...channels].filter((c) => c.orders >= 3).sort((a, b) => b.aov - a.aov)[0]

  /* Category & brand: line sales (before order-level discounts) */
  const lineAgg = useMemo(() => {
    const cat = new Map<Category, number>()
    const brand = new Map<string, { revenue: number; units: number }>()
    const prod = new Map<string, { units: number; revenue: number; profit: number; returns: number }>()
    for (const o of counted) {
      for (const l of o.lines) {
        const p = products.find((x) => x.id === l.productId)
        const e = prod.get(l.productId) ?? { units: 0, revenue: 0, profit: 0, returns: 0 }
        if (o.fulfillment === 'returned') {
          e.returns += l.qty
          prod.set(l.productId, e)
          continue
        }
        const rev = l.price * l.qty
        e.units += l.qty
        e.revenue += rev
        e.profit += (l.price - l.cost) * l.qty
        prod.set(l.productId, e)
        if (p) {
          cat.set(p.category, (cat.get(p.category) ?? 0) + rev)
          const b = brand.get(p.brand) ?? { revenue: 0, units: 0 }
          b.revenue += rev
          b.units += l.qty
          brand.set(p.brand, b)
        }
      }
    }
    const lineTotal = [...cat.values()].reduce((a, b) => a + b, 0)
    return {
      cat: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      brand: [...brand.entries()].map(([b, v]) => ({ brand: b, ...v })).sort((a, b) => b.revenue - a.revenue),
      prod,
      lineTotal,
    }
  }, [counted, products])
  const brandTop = lineAgg.brand.slice(0, 10)
  const top3Share = lineAgg.lineTotal ? lineAgg.brand.slice(0, 3).reduce((s, b) => s + b.revenue, 0) / lineAgg.lineTotal : 0

  /* Geography */
  const geoRows = useMemo(() => {
    const zoneOf = (gid: string) => GOVERNORATES.find((g) => g.id === gid)?.zone ?? 'cairo'
    return geo === 'zone' ? groupBy(kept, (o) => zoneOf(o.governorateId)) : groupBy(kept, (o) => o.governorateId)
  }, [kept, geo])
  const geoName = (key: string) => (geo === 'zone' ? pick(ZONES.find((z) => z.id === key)?.name) : pick(GOVERNORATES.find((g) => g.id === key)?.name))
  const cairoShare = totalRev ? (groupBy(kept, (o) => GOVERNORATES.find((g) => g.id === o.governorateId)?.zone ?? 'cairo').find((r) => r.key === 'cairo')?.revenue ?? 0) / totalRev : 0

  /* Payment mix (all placed orders, so cancellations show) */
  const payRows = useMemo(() => {
    const methods: PaymentMethod[] = ['cod', 'card', 'wallet', 'instapay']
    return methods
      .map((m) => {
        const all = inCur.filter((o) => o.payment === m)
        const cancelled = all.filter((o) => o.status === 'cancelled').length
        return { key: m, orders: all.length, cancelRate: all.length ? cancelled / all.length : 0, revenue: all.filter(isCounted).reduce((s, o) => s + netRevenue(o), 0) }
      })
      .sort((a, b) => b.orders - a.orders)
  }, [inCur])
  const cod = payRows.find((p) => p.key === 'cod')
  const prepaidAll = payRows.filter((p) => p.key !== 'cod')
  const prepaidOrders = prepaidAll.reduce((s, p) => s + p.orders, 0)
  const prepaidCancel = prepaidOrders ? prepaidAll.reduce((s, p) => s + p.cancelRate * p.orders, 0) / prepaidOrders : 0

  /* Order funnel, from orders only */
  const funnel = useMemo(() => {
    const placed = inCur.length
    const confirmed = inCur.filter((o) => o.status !== 'cancelled' && (o.status === 'confirmed' || o.status === 'archived' || o.fulfillment !== 'unfulfilled')).length
    const shipped = inCur.filter((o) => o.status !== 'cancelled' && ['shipped', 'delivered', 'returned'].includes(o.fulfillment)).length
    const delivered = inCur.filter((o) => o.status !== 'cancelled' && ['delivered', 'returned'].includes(o.fulfillment)).length
    const keptN = inCur.filter((o) => o.status !== 'cancelled' && o.fulfillment === 'delivered').length
    return [
      { key: 'placed', label: tx('طلبات اتعملت', 'Placed'), n: placed },
      { key: 'confirmed', label: tx('اتأكدت', 'Confirmed'), n: confirmed },
      { key: 'shipped', label: tx('اتشحنت', 'Shipped'), n: shipped },
      { key: 'delivered', label: tx('اتسلّمت', 'Delivered'), n: delivered },
      { key: 'kept', label: tx('من غير مرتجع', 'Kept (not returned)'), n: keptN },
    ]
  }, [inCur, tx])
  const biggestDrop = funnel.slice(1).reduce(
    (b, s, i) => {
      const lost = funnel[i].n - s.n
      return lost > b.lost ? { lost, from: funnel[i].label, to: s.label } : b
    },
    { lost: 0, from: '', to: '' },
  )

  /* Product table */
  const prodRows = useMemo(() => {
    const rows = [...lineAgg.prod.entries()]
      .map(([id, v]) => ({ p: products.find((x) => x.id === id), ...v, margin: v.revenue ? v.profit / v.revenue : 0 }))
      .filter((r) => !!r.p)
    const by: Record<ProdSort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      revenue: (a, b) => b.revenue - a.revenue,
      units: (a, b) => b.units - a.units,
      profit: (a, b) => b.profit - a.profit,
      margin: (a, b) => b.margin - a.margin,
      returns: (a, b) => b.returns - a.returns,
    }
    return rows.sort(by[prodSort])
  }, [lineAgg, products, prodSort])

  const setDays = (d: number) => {
    const n = new URLSearchParams(params)
    n.set('days', String(d))
    setParams(n, { replace: true })
  }
  const periodLabel = tx(`آخر ${days} يوم`, `last ${days} days`)
  const file = (name: string) => `nuri-${name}-${days}d-${today()}.csv`
  const fmtTick = (v: number) => num(v, { notation: 'compact', maximumFractionDigits: 1 })
  const sortTh = (key: ProdSort, label: string) => (
    <th className="t-num" aria-sort={prodSort === key ? 'descending' : 'none'}>
      <button onClick={() => setProdSort(key)}>
        {label}
        {prodSort === key ? ' ↓' : ''}
      </button>
    </th>
  )

  return (
    <>
      <PageHeader
        title={tx('التحليلات', 'Analytics')}
        description={
          <>
            {tx('كل رقم محسوب من الطلبات الفعلية. ', 'Every figure is computed from actual orders. ')}
            <DemoNote />
          </>
        }
        actions={
          <>
            <Seg
              label={tx('الفترة', 'Period')}
              value={String(days)}
              onChange={(v) => setDays(Number(v))}
              options={[7, 30, 90, 180].map((d) => ({ value: String(d), label: tx(`${d} يوم`, `${d} days`) }))}
            />
            <label className="row small muted" style={{ gap: 8 }}>
              <Switch checked={compare} onChange={setCompare} label={tx('مقارنة بالفترة السابقة', 'Compare to previous period')} />
              {tx('مقارنة', 'Compare')}
            </label>
          </>
        }
      />

      {compare && !canCompare && (
        <div style={{ marginBottom: 12 }}>
          <Note>
            {tx(
              `البيانات بتبدأ ${date(firstOrderAt)}، فمفيش فترة سابقة كاملة بنفس الطول للمقارنة. المقارنة متوقفة للفترة دي.`,
              `Data starts ${date(firstOrderAt)}, so there is no full previous period of the same length. Comparison is off for this range.`,
            )}
          </Note>
        </div>
      )}
      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={tx('صافي المبيعات', 'Net sales')} value={money(k.revenue)} meta={<D on={cmp} c={k.revenue} p={kp.revenue} />} to="/admin/orders" />
        <LedgerCell label={tx('الطلبات', 'Orders')} value={num(k.orders)} meta={<D on={cmp} c={k.orders} p={kp.orders} />} to="/admin/orders" />
        <LedgerCell label={tx('متوسط الطلب', 'Average order')} value={money(k.aov)} meta={<D on={cmp} c={k.aov} p={kp.aov} />} />
        <LedgerCell
          label={tx('مجمل الربح', 'Gross profit')}
          value={money(k.profit)}
          meta={
            <>
              {tx('هامش', 'Margin')} {pct(k.margin)}
              <D on={cmp} c={k.profit} p={kp.profit} />
            </>
          }
        />
        <LedgerCell label={tx('نسبة العملاء الراجعين', 'Returning customers')} value={pct(k.returningRate)} meta={<D on={cmp} c={k.returningRate} p={kp.returningRate} points />} to="/admin/segments" />
        <LedgerCell label={tx('عملاء جداد', 'New customers')} value={num(k.newCustomers)} meta={<D on={cmp} c={k.newCustomers} p={kp.newCustomers} />} to="/admin/customers?sort=newest" />
        <LedgerCell label={tx('نسبة الإلغاء', 'Cancellation rate')} value={pct(k.cancelRate)} meta={<D on={cmp} c={k.cancelRate} p={kp.cancelRate} invert points />} to="/admin/orders" />
        <LedgerCell label={tx('نصيب الدفع عند الاستلام', 'Cash on delivery share')} value={pct(k.codShare, 0)} meta={<D on={cmp} c={k.codShare} p={kp.codShare} invert points />} />
      </div>

      <Pane
        title={tx('المبيعات والربح', 'Sales and profit')}
        description={weekly ? tx('مجمّعة أسبوعيًا؛ أول أسبوع ممكن يكون ناقص', 'Weekly totals; the first week may be partial') : tx('يوميًا', 'Daily')}
        actions={
          <>
            <button className="btn btn--ghost btn--sm" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
              <Table2 size={14} aria-hidden />
              {showTable ? tx('الرسم', 'Chart') : tx('جدول', 'Table')}
            </button>
            <ExportBtn onClick={() => downloadCSV(file('sales'), ['period_start', 'net_sales_egp', 'gross_profit_egp', 'orders', 'previous_period_net_sales_egp'], series.map((s) => [s.date, Math.round(s.revenue), Math.round(s.profit), s.orders, Math.round(s.prevRevenue ?? 0)]))} />
          </>
        }
      >
        <Takeaway>
          {tx('صافي المبيعات في ', 'Net sales over the ')}
          {periodLabel}
          {tx(' كانت ', ' were ')}
          <strong>{money(k.revenue)}</strong>
          {cmp && (
            <>
              {', '}
              {k.revenue >= kp.revenue ? tx('أعلى بـ ', 'up ') : tx('أقل بـ ', 'down ')}
              <strong>{pct(Math.abs(delta(k.revenue, kp.revenue)), 0)}</strong>
              {tx(' من الفترة اللي قبلها', ' on the period before')}
            </>
          )}
          {tx('، والربح ', '; profit kept ')}
          <strong>{pct(k.margin, 0)}</strong>
          {tx(' منها. ', ' of it. ')}
          {bestPoint && bestPoint.revenue > 0 && (
            <>
              {weekly ? tx('أعلى أسبوع بدأ ', 'Best week started ') : tx('أعلى يوم ', 'Best day was ')}
              {date(bestPoint.date)} ({money(bestPoint.revenue)}).
            </>
          )}
        </Takeaway>
        <div className="gr-legend" aria-hidden>
          <span>
            <i style={{ background: 'var(--gr-s1)' }} />
            {tx('صافي المبيعات', 'Net sales')}
          </span>
          <span>
            <i style={{ background: 'var(--gr-s2)' }} />
            {tx('مجمل الربح', 'Gross profit')}
          </span>
          {cmp && (
            <span>
              <i style={{ background: 'var(--gr-prev)' }} />
              {tx('مبيعات الفترة السابقة', 'Previous period sales')}
            </span>
          )}
        </div>
        {showTable ? (
          <div className="table-wrap" style={{ maxHeight: 320 }}>
            <table className="table gr-table-tight">
              <thead>
                <tr>
                  <th>{weekly ? tx('أسبوع يبدأ', 'Week of') : tx('اليوم', 'Day')}</th>
                  <th className="t-num">{tx('صافي المبيعات', 'Net sales')}</th>
                  <th className="t-num">{tx('مجمل الربح', 'Gross profit')}</th>
                  <th className="t-num">{tx('الطلبات', 'Orders')}</th>
                  {cmp && <th className="t-num">{tx('الفترة السابقة', 'Previous')}</th>}
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.date}>
                    <td>{date(s.date)}</td>
                    <td className="t-num">{money(s.revenue)}</td>
                    <td className="t-num">{money(s.profit)}</td>
                    <td className="t-num">{num(s.orders)}</td>
                    {cmp && <td className="t-num">{money(s.prevRevenue ?? 0)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gr-chart" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" reversed={rtl} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(v: string) => date(v, { day: 'numeric', month: 'short' })} />
                <YAxis orientation={rtl ? 'right' : 'left'} tickLine={false} axisLine={false} width={64} tickFormatter={fmtTick} />
                <Tooltip
                  cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
                  content={(p) => (
                    <div dir={dir}>
                    <ChartTip
                      active={p.active}
                      payload={p.payload as never}
                      label={p.label as string}
                      format={(v) => money(v)}
                      labelFormat={(l) => (weekly ? tx(`أسبوع ${date(l)}`, `Week of ${date(l)}`) : date(l, { weekday: 'short', day: 'numeric', month: 'short' }))}
                    />
                    </div>
                  )}
                />
                {cmp && <Line dataKey="prevRevenue" name={tx('الفترة السابقة', 'Previous period')} stroke="var(--gr-prev)" strokeWidth={1.5} dot={false} isAnimationActive={false} />}
                <Line dataKey="revenue" name={tx('صافي المبيعات', 'Net sales')} stroke="var(--gr-s1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--pane)' }} isAnimationActive={false} />
                <Line dataKey="profit" name={tx('مجمل الربح', 'Gross profit')} stroke="var(--gr-s2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--pane)' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Pane>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Pane
          title={tx('الطلبات حسب اليوم والساعة', 'Orders by weekday and hour')}
          description={tx('أفضل وقت للنشر على إنستجرام وتيك توك', 'When to post on Instagram and TikTok')}
          actions={
            <ExportBtn
              onClick={() =>
                downloadCSV(
                  file('weekday-hour'),
                  ['weekday', ...wh.hours.map((h) => `${h}:00`)],
                  WEEK.map((d) => [dayName(d, true), ...wh.hours.map((h) => wh.g[d][h])]),
                )
              }
            />
          }
        >
          <Takeaway>
            {wh.peak.n > 0 ? (
              <>
                {tx('الذروة ', 'Peak is ')}
                <strong>
                  {dayName(wh.peak.d, true)} {hourName(wh.peak.h)}
                </strong>
                {tx(` (${wh.peak.n} طلب). النشر قبلها بساعة بيلحق الناس وهي بتتفرّج. أهدى يوم: ${dayName(wh.dayTotals.indexOf(Math.min(...wh.dayTotals)), true)}.`, ` (${wh.peak.n} orders). Posting an hour before catches people while they browse. Quietest day: ${dayName(wh.dayTotals.indexOf(Math.min(...wh.dayTotals)), true)}.`)}
              </>
            ) : (
              tx('مفيش طلبات في الفترة دي.', 'No orders in this period.')
            )}
          </Takeaway>
          <div className="table-wrap">
            <div className="gr-heat" style={{ gridTemplateColumns: `56px repeat(${wh.hours.length}, minmax(18px, 1fr))`, minWidth: 56 + wh.hours.length * 20 }} role="table" aria-label={tx('الطلبات حسب اليوم والساعة', 'Orders by weekday and hour')}>
              <span />
              {wh.hours.map((h) => (
                <span key={h} className="gr-heat__axis" role="columnheader">
                  {h % 3 === 0 ? h : ''}
                </span>
              ))}
              {WEEK.map((d) => (
                <div key={d} role="row" style={{ display: 'contents' }}>
                  <span className="gr-heat__axis gr-heat__axis--start" role="rowheader">
                    {dayName(d)}
                  </span>
                  {wh.hours.map((h) => {
                    const n = wh.g[d][h]
                    return (
                      <span key={h} role="cell" className="gr-heat__cell" style={{ ...heat(n / wh.max), minHeight: 22 }} title={`${dayName(d, true)} ${hourName(h)}: ${n}`} aria-label={`${dayName(d, true)} ${hourName(h)}: ${n}`} />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="row-between" style={{ marginTop: 10 }}>
            <span className="tiny faint">{tx('الساعة بتوقيت القاهرة', 'Hours in Cairo time')}</span>
            <span className="gr-ramp">
              0<span className="gr-ramp__bar" aria-hidden />
              {num(wh.max)}
            </span>
          </div>
        </Pane>

        <Pane
          title={tx('المبيعات حسب القناة', 'Sales by channel')}
          actions={<ExportBtn onClick={() => downloadCSV(file('channels'), ['channel', 'orders', 'net_sales_egp', 'share', 'aov_egp'], channels.map((c) => [CHANNEL[c.key].en, c.orders, Math.round(c.revenue), (c.revenue / (totalRev || 1)).toFixed(4), Math.round(c.aov)]))} />}
        >
          <Takeaway>
            {topCh ? (
              <>
                <strong>{pick(CHANNEL[topCh.key])}</strong>
                {tx(` جاب ${pct(topCh.revenue / (totalRev || 1), 0)} من المبيعات.`, ` brought ${pct(topCh.revenue / (totalRev || 1), 0)} of sales.`)}
                {bestAovCh && bestAovCh.key !== topCh.key && <>{tx(` أعلى متوسط طلب من ${pick(CHANNEL[bestAovCh.key])} (${money(bestAovCh.aov)}).`, ` The highest average order comes from ${pick(CHANNEL[bestAovCh.key])} (${money(bestAovCh.aov)}).`)}</>}
              </>
            ) : (
              tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')
            )}
          </Takeaway>
          <BarList
            items={channels.map((c) => ({
              key: c.key,
              label: pick(CHANNEL[c.key]),
              value: c.revenue,
              display: (
                <>
                  <strong>{money(c.revenue)}</strong> {pct(c.revenue / (totalRev || 1), 0)}
                  <span className="tiny faint" style={{ display: 'block' }}>
                    {tx(`${num(c.orders)} طلب، متوسط ${money(c.aov)}`, `${num(c.orders)} orders, ${money(c.aov)} avg`)}
                  </span>
                </>
              ),
            }))}
          />
        </Pane>

        <Pane
          title={tx('المبيعات حسب الفئة', 'Sales by category')}
          description={tx('مبيعات السطور قبل خصم الطلب', 'Line sales before order discounts')}
          actions={<ExportBtn onClick={() => downloadCSV(file('categories'), ['category', 'line_sales_egp', 'share'], lineAgg.cat.map(([c, v]) => [CATEGORY_LABEL[c].en, Math.round(v), (v / (lineAgg.lineTotal || 1)).toFixed(4)]))} />}
        >
          <Takeaway>
            {lineAgg.cat.length ? (
              <>
                <strong>{pick(CATEGORY_LABEL[lineAgg.cat[0][0]])}</strong>
                {tx(` أكبر فئة بنسبة ${pct(lineAgg.cat[0][1] / (lineAgg.lineTotal || 1), 0)}`, ` lead with ${pct(lineAgg.cat[0][1] / (lineAgg.lineTotal || 1), 0)}`)}
                {lineAgg.cat.length > 1 && <>{tx(`، وبعدها ${pick(CATEGORY_LABEL[lineAgg.cat[1][0]])}.`, `, then ${pick(CATEGORY_LABEL[lineAgg.cat[1][0]])}.`)}</>}
              </>
            ) : (
              tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')
            )}
          </Takeaway>
          <BarList
            items={lineAgg.cat.map(([c, v]) => ({
              key: c,
              label: pick(CATEGORY_LABEL[c]),
              value: v,
              to: `/admin/products?category=${c}`,
              display: (
                <>
                  <strong>{money(v, { compact: v >= 100000 })}</strong> {pct(v / (lineAgg.lineTotal || 1), 0)}
                </>
              ),
            }))}
          />
        </Pane>

        <Pane
          title={tx('أعلى 10 براندات', 'Top 10 brands')}
          description={tx('مبيعات السطور قبل خصم الطلب', 'Line sales before order discounts')}
          actions={<ExportBtn onClick={() => downloadCSV(file('brands'), ['brand', 'line_sales_egp', 'units', 'share'], lineAgg.brand.map((b) => [b.brand, Math.round(b.revenue), b.units, (b.revenue / (lineAgg.lineTotal || 1)).toFixed(4)]))} />}
        >
          <Takeaway>
            {brandTop.length ? (
              <>
                <strong>{brandTop[0].brand}</strong>
                {tx(` في المقدمة. أعلى 3 براندات = ${pct(top3Share, 0)} من المبيعات`, ` leads. The top 3 brands make ${pct(top3Share, 0)} of sales`)}
                {top3Share > 0.5 ? tx('، فأي تأخير في شحناتهم هيأثّر بقوة.', ', so a delay in their shipments would hit hard.') : '.'}
              </>
            ) : (
              tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')
            )}
          </Takeaway>
          <div dir="ltr" style={{ width: '100%', height: Math.max(160, brandTop.length * 30 + 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brandTop} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" reversed={rtl} tickLine={false} axisLine={false} tickFormatter={fmtTick} />
                <YAxis type="category" dataKey="brand" orientation={rtl ? 'right' : 'left'} tickLine={false} axisLine={false} width={120} interval={0} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={(p) => (
                    <div dir={dir}>
                      <ChartTip active={p.active} payload={p.payload as never} label={p.label as string} format={(v) => money(v)} />
                    </div>
                  )} />
                <Bar dataKey="revenue" name={tx('المبيعات', 'Sales')} fill="var(--gr-s1)" radius={rtl ? [4, 0, 0, 4] : [0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Pane>

        <Pane
          title={tx('المبيعات حسب المكان', 'Sales by location')}
          actions={
            <>
              <Seg
                label={tx('التجميع', 'Group by')}
                value={geo}
                onChange={setGeo}
                options={[
                  { value: 'zone', label: tx('منطقة الشحن', 'Zone') },
                  { value: 'gov', label: tx('المحافظة', 'Governorate') },
                ]}
              />
              <ExportBtn onClick={() => downloadCSV(file(geo === 'zone' ? 'zones' : 'governorates'), [geo, 'orders', 'net_sales_egp', 'share', 'aov_egp'], geoRows.map((r) => [geo === 'zone' ? ZONES.find((z) => z.id === r.key)?.name.en : GOVERNORATES.find((g) => g.id === r.key)?.name.en, r.orders, Math.round(r.revenue), (r.revenue / (totalRev || 1)).toFixed(4), Math.round(r.aov)]))} />
            </>
          }
        >
          <Takeaway>
            {totalRev ? (
              <>
                {tx('القاهرة الكبرى = ', 'Greater Cairo is ')}
                <strong>{pct(cairoShare, 0)}</strong>
                {tx(' من المبيعات؛ الباقي ', ' of sales; the other ')}
                <strong>{pct(1 - cairoShare, 0)}</strong>
                {tx(' بيتشحن لمسافات أطول وتكلفة أعلى.', ' ships further at a higher cost.')}
              </>
            ) : (
              tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')
            )}
          </Takeaway>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            <BarList
              items={geoRows.map((r) => ({
                key: r.key,
                label: geoName(r.key),
                value: r.revenue,
                to: geo === 'gov' ? `/admin/customers?gov=${r.key}` : '/admin/shipping',
                display: (
                  <>
                    <strong>{money(r.revenue, { compact: r.revenue >= 100000 })}</strong> {pct(r.revenue / (totalRev || 1), 0)}
                  </>
                ),
              }))}
            />
          </div>
        </Pane>

        <Pane
          title={tx('طرق الدفع', 'Payment mix')}
          description={tx('كل الطلبات اللي اتعملت، شاملة الملغي', 'All placed orders, including cancelled')}
          actions={<ExportBtn onClick={() => downloadCSV(file('payments'), ['method', 'orders', 'share', 'cancel_rate', 'net_sales_egp'], payRows.map((p) => [PAYMENT[p.key].en, p.orders, (p.orders / (inCur.length || 1)).toFixed(4), p.cancelRate.toFixed(4), Math.round(p.revenue)]))} />}
        >
          <Takeaway>
            {cod && cod.orders ? (
              <>
                {tx('الدفع عند الاستلام = ', 'Cash on delivery is ')}
                <strong>{pct(cod.orders / (inCur.length || 1), 0)}</strong>
                {tx(' من الطلبات، ونسبة إلغائه ', ' of orders and cancels at ')}
                <strong>{pct(cod.cancelRate)}</strong>
                {tx(` مقابل ${pct(prepaidCancel)} للمدفوع مقدمًا.`, ` against ${pct(prepaidCancel)} for prepaid.`)}
                {cod.cancelRate > prepaidCancel * 1.5 && tx(' تأكيد الطلب على واتساب قبل الشحن بيوفّر تكلفة المرتجع.', ' Confirming on WhatsApp before shipping saves return costs.')}
              </>
            ) : (
              tx('مفيش طلبات في الفترة دي.', 'No orders in this period.')
            )}
          </Takeaway>
          <BarList
            items={payRows.map((p) => ({
              key: p.key,
              label: pick(PAYMENT[p.key]),
              value: p.orders,
              display: (
                <>
                  <strong>{pct(p.orders / (inCur.length || 1), 0)}</strong> {tx(`${num(p.orders)} طلب`, `${num(p.orders)} orders`)}
                  <span className="tiny faint" style={{ display: 'block' }}>
                    {tx(`إلغاء ${pct(p.cancelRate)}`, `${pct(p.cancelRate)} cancelled`)}
                  </span>
                </>
              ),
            }))}
          />
        </Pane>
      </div>

      <div className="grid grid-main" style={{ marginTop: 16 }}>
        <Pane
          title={tx('أداء المنتجات', 'Product performance')}
          description={periodLabel}
          flush
          actions={
            <ExportBtn
              onClick={() =>
                downloadCSV(
                  file('products'),
                  ['sku', 'product', 'brand', 'units', 'line_sales_egp', 'gross_profit_egp', 'margin', 'returned_units'],
                  prodRows.map((r) => [r.p!.sku, r.p!.name.en, r.p!.brand, r.units, Math.round(r.revenue), Math.round(r.profit), r.margin.toFixed(4), r.returns]),
                )
              }
            />
          }
        >
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{tx('المنتج', 'Product')}</th>
                  {sortTh('units', tx('وحدات', 'Units'))}
                  {sortTh('revenue', tx('المبيعات', 'Sales'))}
                  {sortTh('profit', tx('الربح', 'Profit'))}
                  {sortTh('margin', tx('الهامش', 'Margin'))}
                  {sortTh('returns', tx('مرتجع', 'Returns'))}
                </tr>
              </thead>
              <tbody>
                {(prodAll ? prodRows : prodRows.slice(0, 12)).map((r) => (
                  <tr key={r.p!.id}>
                    <td>
                      <Link to={`/admin/products/${r.p!.id}`} className="row" style={{ color: 'inherit', gap: 10 }}>
                        <Thumb product={r.p!} />
                        <span style={{ minWidth: 0 }}>
                          <span className="small strong ellipsis" style={{ display: 'block', maxWidth: 280 }}>
                            {pick(r.p!.name)}
                          </span>
                          <span className="tiny faint">{r.p!.brand}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="t-num">{num(r.units)}</td>
                    <td className="t-num">{money(r.revenue)}</td>
                    <td className="t-num">{money(r.profit)}</td>
                    <td className="t-num">{pct(r.margin, 0)}</td>
                    <td className="t-num">{r.returns ? <span style={{ color: 'var(--bad)' }}>{num(r.returns)}</span> : <span className="faint">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prodRows.length > 12 && (
            <div className="pane__foot">
              <span className="num">{tx(`${num(prodRows.length)} منتج اتباع`, `${num(prodRows.length)} products sold`)}</span>
              <button className="btn btn--sm" onClick={() => setProdAll((v) => !v)}>
                {prodAll ? tx('عرض أقل', 'Show fewer') : tx('عرض الكل', 'Show all')}
              </button>
            </div>
          )}
        </Pane>

        <Pane title={tx('مسار الطلب', 'Order funnel')} description={tx('من الطلب لحد التسليم', 'From order to doorstep')} actions={<ExportBtn onClick={() => downloadCSV(file('funnel'), ['stage', 'orders', 'share_of_placed'], funnel.map((f) => [f.key, f.n, (f.n / (funnel[0].n || 1)).toFixed(4)]))} />}>
          <Takeaway>
            {funnel[0].n ? (
              <>
                <strong>{pct(funnel[4].n / funnel[0].n, 0)}</strong>
                {tx(' من الطلبات وصلت واتقبلت. ', ' of orders were delivered and kept. ')}
                {biggestDrop.lost > 0 && <>{tx(`أكبر فاقد بين «${biggestDrop.from}» و«${biggestDrop.to}» (${num(biggestDrop.lost)} طلب)، وجزء منه طلبات لسه في الطريق.`, `The biggest drop is from “${biggestDrop.from}” to “${biggestDrop.to}” (${num(biggestDrop.lost)} orders), partly orders still in transit.`)}</>}
              </>
            ) : (
              tx('مفيش طلبات في الفترة دي.', 'No orders in this period.')
            )}
          </Takeaway>
          <BarList
            max={funnel[0].n || 1}
            items={funnel.map((f) => ({
              key: f.key,
              label: f.label,
              value: f.n,
              display: (
                <>
                  <strong>{num(f.n)}</strong> {pct(f.n / (funnel[0].n || 1), 0)}
                </>
              ),
            }))}
          />
          <div style={{ marginTop: 12 }}>
            <Note>{tx('زيارات المتجر وإضافات السلة مش متتبَّعة لسه، فمعدّل التحويل من زيارة لطلب مش معروض. ربط أداة تحليلات (زي GA4) هيكمّل أول المسار.', 'Store visits and add-to-cart events are not tracked yet, so visit-to-order conversion is not shown. Connecting an analytics tool (such as GA4) would complete the top of the funnel.')}</Note>
          </div>
        </Pane>
      </div>
    </>
  )
}
