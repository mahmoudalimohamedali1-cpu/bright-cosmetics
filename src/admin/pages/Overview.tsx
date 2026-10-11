import { useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, ComposedChart, Area, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Banknote, Boxes, CalendarClock, MessageCircle, PackageCheck, ShoppingCart, Star, type LucideProps } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { ChartTip, DemoNote, Delta, Pane, PageHeader, Seg, Thumb, useAdmin } from '../ui'
import { delta, expiringBatches, isCounted, kpis, netRevenue, productSales, rangeFor, stock, daysOfCover, dailySeries } from '../../lib/metrics'
import { DAY } from '../../lib/rand'
import { CATEGORY_LABEL } from '../../data/catalog'
import type { Category } from '../../data/types'
import { BarList, ChartLegend, Forward } from '../parts/core/ui'
import { LEAD_DAYS, gov, inView } from '../parts/core/lib'
import { canOpen } from '../access'

type Period = '1' | '7' | '30' | '90'
type TipPayload = { name?: string; value?: number; color?: string; dataKey?: string }[]

export default function Overview() {
  const { tx, pick, money, num, pct, date, relTime, dir } = useI18n()
  const { staff, can } = useAdmin()
  // Sales, margin and profit figures are analytics; other roles get their queues and the activity feed.
  const seeSales = can('analytics.view')
  const [period, setPeriod] = useState<Period>('30')
  const days = Number(period)

  const orders = useStore((s) => s.orders)
  const customers = useStore((s) => s.customers)
  const products = useStore((s) => s.products)
  const reviews = useStore((s) => s.reviews)
  const abandoned = useStore((s) => s.abandoned)
  const activity = useStore((s) => s.activity)
  const settings = useStore((s) => s.settings)

  // Current period runs from the start of the window to now; the previous period is
  // the same span shifted back, cut at the same elapsed time, so partial days compare fairly.
  const range = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const from = start.getTime() - (days - 1) * DAY
    const to = Date.now()
    return { from, to, prevFrom: from - days * DAY, prevTo: to - days * DAY }
  }, [days])

  const cur = useMemo(() => kpis(orders, customers, range.from, range.to), [orders, customers, range])
  const prev = useMemo(() => kpis(orders, customers, range.prevFrom, range.prevTo), [orders, customers, range])
  const vsLabel = days === 1 ? tx('مقارنة بنفس الوقت أمس', 'vs same time yesterday') : tx(`مقارنة بالـ${num(days)} يوم السابقة`, `vs previous ${days} days`)

  /* ───── Action queue ───── */
  const queue = useMemo(() => {
    const toConfirm = orders.filter((o) => inView(o, 'confirm'))
    const toPack = orders.filter((o) => inView(o, 'pack'))
    const codOut = orders.filter((o) => inView(o, 'cod'))
    const s30 = productSales(orders, Date.now() - 30 * DAY)
    const low = products.filter((p) => p.status === 'active' && stock(p) <= p.lowStockAt)
    const lowRevenue = low.reduce((a, p) => a + (s30.get(p.id)?.revenue ?? 0), 0)
    const exp = expiringBatches(products, settings.expiryWarnDays)
    const expValue = exp.reduce((a, e) => a + e.batch.qty * e.product.cost, 0)
    const pending = reviews.filter((r) => r.status === 'pending')
    const carts = abandoned.filter((a) => !a.recovered && a.phone && Date.now() - new Date(a.createdAt).getTime() < 7 * DAY)
    const sum = (xs: { total: number }[]) => xs.reduce((a, x) => a + x.total, 0)
    return { toConfirm, toPack, codOut, low, lowRevenue, exp, expValue, pending, carts, sum }
  }, [orders, products, reviews, abandoned, settings.expiryWarnDays])

  type Row = { key: string; icon: ComponentType<LucideProps>; tone: 'warn' | 'bad' | 'info' | 'ok'; title: string; hint: string; count: number; money: string; to: string }
  const rows: Row[] = [
    {
      key: 'confirm',
      icon: MessageCircle,
      tone: 'warn',
      title: tx('طلبات محتاجة تأكيد على واتساب', 'Orders to confirm on WhatsApp'),
      hint: tx('طلبات جديدة لسه ما اتأكدتش مع العميل قبل التجهيز', 'New orders not yet confirmed with the customer'),
      count: queue.toConfirm.length,
      money: money(queue.sum(queue.toConfirm)),
      to: '/admin/orders?view=confirm',
    },
    {
      key: 'pack',
      icon: PackageCheck,
      tone: 'info',
      title: tx('طلبات للتجهيز والشحن', 'Orders to pack and ship'),
      hint: tx('مؤكَّدة ومستنية التغليف أو التسليم لشركة الشحن', 'Confirmed, waiting to be packed or handed to a courier'),
      count: queue.toPack.length,
      money: money(queue.sum(queue.toPack)),
      to: '/admin/orders?view=pack',
    },
    {
      key: 'cod',
      icon: Banknote,
      tone: 'info',
      title: tx('تحصيل مع شركات الشحن', 'Cash on delivery to collect'),
      hint: tx('طلبات دفع عند الاستلام اتشحنت ولسه المبلغ ما اتحصّلش', 'Shipped COD orders whose cash is still with the courier'),
      count: queue.codOut.length,
      money: money(queue.sum(queue.codOut)),
      to: '/admin/orders?view=cod',
    },
    {
      key: 'low',
      icon: Boxes,
      tone: 'bad',
      title: tx('منتجات مخزونها قليل', 'Low-stock products'),
      hint: tx('مبيعات آخر 30 يوم للمنتجات دي معرّضة للتوقف', 'Last-30-day sales of these products are at risk'),
      count: queue.low.length,
      money: money(queue.lowRevenue),
      to: '/admin/inventory?tab=stock&filter=low',
    },
    {
      key: 'exp',
      icon: CalendarClock,
      tone: 'warn',
      title: tx(`تشغيلات صلاحيتها أقل من ${num(settings.expiryWarnDays)} يوم`, `Lots expiring within ${settings.expiryWarnDays} days`),
      hint: tx('قيمتها بالتكلفة. تتباع الأقدم أولًا أو تدخل عرض', 'Value at landed cost. Sell first-expiry-first or promote'),
      count: queue.exp.length,
      money: money(queue.expValue),
      to: '/admin/inventory?tab=expiry',
    },
    {
      key: 'reviews',
      icon: Star,
      tone: 'info',
      title: tx('تقييمات مستنية مراجعة', 'Reviews waiting for moderation'),
      hint: tx('بتظهر في صفحة المنتج بعد الموافقة', 'They appear on product pages once approved'),
      count: queue.pending.length,
      money: tx(`${num(new Set(queue.pending.map((r) => r.productId)).size)} منتج`, `${num(new Set(queue.pending.map((r) => r.productId)).size)} products`),
      to: '/admin/reviews?status=pending',
    },
    {
      key: 'carts',
      icon: ShoppingCart,
      tone: 'warn',
      title: tx('سلال متروكة تستاهل متابعة', 'Abandoned carts worth recovering'),
      hint: tx('آخر 7 أيام وفيها رقم تليفون', 'Last 7 days, with a phone number'),
      count: queue.carts.length,
      money: money(queue.sum(queue.carts)),
      to: '/admin/abandoned',
    },
  ]
  const mine = rows.filter((r) => canOpen(can, r.to))
  const open = mine.filter((r) => r.count > 0)
  const clear = mine.filter((r) => r.count === 0)

  /* ───── Chart ───── */
  const series = useMemo(() => {
    if (days === 1) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const t0 = start.getTime()
      const nowH = new Date().getHours()
      const pts = Array.from({ length: 24 }, (_, h) => ({ key: String(h), revenue: h <= nowH ? 0 : (undefined as number | undefined), prevRevenue: 0 }))
      for (const o of orders) {
        if (!isCounted(o)) continue
        const t = new Date(o.createdAt).getTime()
        if (t >= t0 && t < t0 + DAY) {
          const p = pts[new Date(t).getHours()]
          if (p.revenue !== undefined) p.revenue += netRevenue(o)
        } else if (t >= t0 - DAY && t < t0) pts[new Date(t).getHours()].prevRevenue += netRevenue(o)
      }
      return pts
    }
    // Key by local-midnight timestamp: d.date is a UTC slice and reads a day early east of UTC.
    const from0 = rangeFor(days).from
    return dailySeries(orders, days).map((d, i) => ({ key: String(from0 + i * DAY), revenue: d.revenue as number | undefined, prevRevenue: d.prevRevenue ?? 0 }))
  }, [orders, days])
  const fmtKey = (k: string) => (days === 1 ? `${k.padStart(2, '0')}:00` : date(Number(k), { day: 'numeric', month: 'short' }))
  const curName = tx('الفترة الحالية', 'This period')
  const prevName = days === 1 ? tx('أمس', 'Yesterday') : tx('الفترة السابقة', 'Previous period')

  /* ───── Insights: fixed rules over store data ───── */
  const insights = useMemo(() => {
    const out: { key: string; fig: string; tone?: 'ok' | 'bad' | 'warn'; text: string; to: string }[] = []
    const now = Date.now()
    const s30 = productSales(orders, now - 30 * DAY, now)
    const p30 = productSales(orders, now - 60 * DAY, now - 30 * DAY)
    const byCat = (m: Map<string, { revenue: number }>) => {
      const r = new Map<Category, number>()
      m.forEach((v, id) => {
        const p = products.find((x) => x.id === id)
        if (p) r.set(p.category, (r.get(p.category) ?? 0) + v.revenue)
      })
      return r
    }
    const c1 = byCat(s30)
    const c0 = byCat(p30)
    const total0 = [...c0.values()].reduce((a, b) => a + b, 0)
    const moves = [...c1.entries()]
      .filter(([c]) => (c0.get(c) ?? 0) > total0 * 0.03)
      .map(([c, v]) => ({ c, d: delta(v, c0.get(c) ?? 0) }))
      .sort((a, b) => b.d - a.d)
    const up = moves[0]
    if (up && up.d > 0.02)
      out.push({
        key: 'cat-up',
        fig: `+${pct(up.d, 0)}`,
        tone: 'ok',
        text: tx(`مبيعات ${CATEGORY_LABEL[up.c].ar} زادت مقارنة بالـ30 يوم السابقة`, `${CATEGORY_LABEL[up.c].en} sales up vs the previous 30 days`),
        to: `/admin/products?category=${up.c}`,
      })
    const down = moves[moves.length - 1]
    if (down && down.d < -0.08)
      out.push({
        key: 'cat-down',
        fig: `−${pct(Math.abs(down.d), 0)}`,
        tone: 'bad',
        text: tx(`مبيعات ${CATEGORY_LABEL[down.c].ar} قلّت مقارنة بالـ30 يوم السابقة`, `${CATEGORY_LABEL[down.c].en} sales down vs the previous 30 days`),
        to: `/admin/products?category=${down.c}`,
      })

    const runOut = products.filter((p) => p.status === 'active' && (s30.get(p.id)?.units ?? 0) > 0 && daysOfCover(p, s30) < LEAD_DAYS)
    if (runOut.length)
      out.push({
        key: 'runout',
        fig: num(runOut.length),
        tone: 'warn',
        text: tx(
          `منتجات هتخلص قبل ما شحنة جديدة توصل (المخزون يكفي أقل من ${num(LEAD_DAYS)} يوم، ومدة التوريد ${num(LEAD_DAYS)} يوم)`,
          `products will run out before a new shipment can land (under ${LEAD_DAYS} days of cover, ${LEAD_DAYS}-day lead time)`,
        ),
        to: '/admin/inventory?tab=stock&filter=reorder',
      })

    const cod90 = orders.filter((o) => o.payment === 'cod' && now - new Date(o.createdAt).getTime() < 90 * DAY)
    const upper = cod90.filter((o) => gov(o.governorateId)?.zone === 'upper')
    const rate = (xs: typeof cod90) => (xs.length ? xs.filter((o) => o.status === 'cancelled').length / xs.length : 0)
    if (upper.length >= 5) {
      const ru = rate(upper)
      const ra = rate(cod90)
      out.push({
        key: 'cod-upper',
        fig: pct(ru, 1),
        tone: ru > ra ? 'bad' : undefined,
        text: tx(
          `نسبة إلغاء طلبات الدفع عند الاستلام في الصعيد (آخر 90 يوم)، مقابل ${pct(ra, 1)} في كل المحافظات`,
          `COD cancellation rate in Upper Egypt (last 90 days), vs ${pct(ra, 1)} across all governorates`,
        ),
        to: '/admin/orders?view=cancelled',
      })
    }

    const top = [...s30.entries()].sort((a, b) => b[1].profit - a[1].profit).slice(0, 3)
    const profitAll = [...s30.values()].reduce((a, v) => a + v.profit, 0)
    if (top.length === 3 && profitAll > 0) {
      const names = top.map(([id]) => products.find((p) => p.id === id)).filter(Boolean).map((p) => p!.brand)
      out.push({
        key: 'top3',
        fig: pct(top.reduce((a, [, v]) => a + v.profit, 0) / profitAll, 0),
        text: tx(`من إجمالي ربح آخر 30 يوم جه من 3 منتجات (${names.join('، ')})`, `of last-30-day gross profit came from 3 products (${names.join(', ')})`),
        to: '/admin/products?sort=profit',
      })
    }

    const k30 = kpis(orders, customers, now - 30 * DAY, now)
    out.push({
      key: 'returning',
      fig: pct(k30.returningRate, 0),
      text: tx('من العملاء اللي اشتروا آخر 30 يوم كانوا عملاء سابقين', 'of customers who bought in the last 30 days had bought before'),
      to: '/admin/segments',
    })
    return out
  }, [orders, products, customers, tx, pct, num])

  /* ───── Lists ───── */
  const topProducts = useMemo(() => {
    const m = productSales(orders, range.from, range.to)
    return [...m.entries()]
      .sort((a, b) => b[1].profit - a[1].profit)
      .slice(0, 5)
      .map(([id, v]) => ({ p: products.find((x) => x.id === id), ...v }))
      .filter((x) => x.p)
  }, [orders, products, range])

  const byGov = useMemo(() => {
    const m = new Map<string, { revenue: number; orders: number }>()
    for (const o of orders) {
      const t = new Date(o.createdAt).getTime()
      if (!isCounted(o) || t < range.from || t >= range.to) continue
      const e = m.get(o.governorateId) ?? { revenue: 0, orders: 0 }
      e.revenue += netRevenue(o)
      e.orders += 1
      m.set(o.governorateId, e)
    }
    return [...m.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8)
  }, [orders, range])

  const recent = useMemo(() => [...activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8), [activity])

  const hour = new Date().getHours()
  const first = staff.split(' ')[0]
  const greet = hour < 12 ? tx('صباح الخير', `Good morning, ${first}`) : hour < 18 ? tx('مساء الخير', `Good afternoon, ${first}`) : tx('مساء النور', `Good evening, ${first}`)

  return (
    <>
      <PageHeader
        title={greet}
        description={
          <span className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span>{date(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <DemoNote />
          </span>
        }
        actions={
          <Seg<Period>
            label={tx('الفترة', 'Period')}
            value={period}
            onChange={setPeriod}
            options={[
              { value: '1', label: tx('اليوم', 'Today') },
              { value: '7', label: tx('7 أيام', '7 days') },
              { value: '30', label: tx('30 يوم', '30 days') },
              { value: '90', label: tx('90 يوم', '90 days') },
            ]}
          />
        }
      />

      <div className="stack">
        <Pane
          title={tx('محتاج إجراء النهارده', 'Needs action today')}
          description={open.length ? tx(`${num(open.length)} من ${num(mine.length)} قوائم فيها شغل`, `${open.length} of ${mine.length} queues have work waiting`) : undefined}
          flush
        >
          <ul className="core-queue">
            {[...open, ...clear].map((r) => (
              <li key={r.key} data-clear={r.count === 0}>
                <Link to={r.to}>
                  <span className="core-queue__icon" data-tone={r.count ? r.tone : 'ok'}>
                    <r.icon size={16} aria-hidden />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="core-queue__title">{r.title}</span>
                    <span className="small faint" style={{ display: 'block' }}>
                      {r.count ? r.hint : tx('مفيش حاجة مستنية', 'Nothing waiting')}
                    </span>
                  </span>
                  <span className="core-queue__money">{r.count ? r.money : ''}</span>
                  <span className="row" style={{ gap: 4 }}>
                    <span className="core-queue__count">{num(r.count)}</span>
                    <Forward />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Pane>

        {seeSales && (
        <div className="ledger" style={{ ['--cols' as string]: 4 }}>
          <Link className="ledger__cell" to="/admin/analytics">
            <div className="ledger__label">{tx('صافي المبيعات', 'Net sales')}</div>
            <div className="ledger__value">{money(cur.revenue)}</div>
            <div className="ledger__meta">
              <Delta value={delta(cur.revenue, prev.revenue)} />
              {vsLabel}
            </div>
          </Link>
          <Link className="ledger__cell" to="/admin/orders">
            <div className="ledger__label">{tx('الطلبات', 'Orders')}</div>
            <div className="ledger__value">{num(cur.orders)}</div>
            <div className="ledger__meta">
              <Delta value={delta(cur.orders, prev.orders)} />
              {vsLabel}
            </div>
          </Link>
          <Link className="ledger__cell" to="/admin/analytics">
            <div className="ledger__label">{tx('متوسط قيمة الطلب', 'Average order value')}</div>
            <div className="ledger__value">{money(cur.aov)}</div>
            <div className="ledger__meta">
              <Delta value={delta(cur.aov, prev.aov)} />
              {vsLabel}
            </div>
          </Link>
          <Link className="ledger__cell" to="/admin/analytics">
            <div className="ledger__label">{tx('هامش الربح بعد تكلفة الاستيراد', 'Gross margin after landed cost')}</div>
            <div className="ledger__value">{pct(cur.margin, 1)}</div>
            <div className="ledger__meta">
              <span>{tx(`ربح ${money(cur.profit)}`, `${money(cur.profit)} profit`)}</span>
              <Delta value={delta(cur.profit, prev.profit)} />
            </div>
          </Link>
        </div>
        )}

        {seeSales && (
        <div className="grid grid-main">
          <Pane
            title={tx('صافي المبيعات', 'Net sales')}
            description={days === 1 ? tx('بالساعة، النهارده مقابل أمس', 'By hour, today vs yesterday') : tx(`باليوم، آخر ${num(days)} يوم مقابل اللي قبلهم`, `By day, last ${days} days vs the ${days} before`)}
            actions={<ChartLegend items={[{ label: curName, color: 'var(--chart-1)' }, { label: prevName, color: 'var(--fg-3)', dashed: true }]} />}
          >
            <div className="core-chart" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="key"
                    reversed={dir === 'rtl'}
                    tickFormatter={fmtKey}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    orientation={dir === 'rtl' ? 'right' : 'left'}
                    tickFormatter={(v: number) => money(v, { compact: true })}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
                    content={(p) => (
                      <ChartTip active={p.active} payload={p.payload as unknown as TipPayload} label={String(p.label ?? '')} format={(v) => money(v)} labelFormat={fmtKey} />
                    )}
                  />
                  <Line name={prevName} dataKey="prevRevenue" stroke="var(--fg-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} isAnimationActive={false} />
                  <Area
                    name={curName}
                    dataKey="revenue"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="var(--chart-1)"
                    fillOpacity={0.1}
                    activeDot={{ r: 4, stroke: 'var(--pane)', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Pane>

          <Pane title={tx('ملاحظات من بيانات المتجر', 'Insights from store data')} description={tx('محسوبة بقواعد ثابتة من الطلبات والمخزون، مش ذكاء اصطناعي', 'Computed with fixed rules from orders and stock, not AI')} flush>
            {insights.length ? (
              <ul className="core-insights">
                {insights.map((i) => (
                  <li key={i.key}>
                    <Link to={i.to}>
                      <span className="core-insights__fig" data-tone={i.tone}>
                        <bdi dir="ltr">{i.fig}</bdi>
                      </span>
                      <span className="small" style={{ flex: 1 }}>
                        {i.text}
                      </span>
                      <Forward />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('لسه مفيش بيانات كفاية لملاحظات.', 'Not enough data yet for insights.')}
              </p>
            )}
          </Pane>
        </div>
        )}

        <div className="grid grid-3">
          {seeSales && (
          <>
          <Pane title={tx('أعلى المنتجات ربحًا', 'Top products by profit')} description={tx('بعد تكلفة الاستيراد، في الفترة المختارة', 'After landed cost, in this period')} flush>
            {topProducts.length ? (
              <ul className="list">
                {topProducts.map(({ p, units, profit, revenue }) => (
                  <li key={p!.id}>
                    <Thumb product={p!} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link to={`/admin/products/${p!.id}`} className="ellipsis" style={{ display: 'block' }}>
                        {pick(p!.name)}
                      </Link>
                      <span className="tiny faint num">{tx(`${num(units)} قطعة، مبيعات ${money(revenue)}`, `${num(units)} units, ${money(revenue)} sales`)}</span>
                    </div>
                    <span className="num strong small">{money(profit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')}
              </p>
            )}
          </Pane>

          <Pane title={tx('المبيعات حسب المحافظة', 'Sales by governorate')} description={tx('صافي المبيعات في الفترة المختارة', 'Net sales in this period')} flush>
            <BarList
              empty={tx('مفيش مبيعات في الفترة دي.', 'No sales in this period.')}
              rows={byGov.map(([id, v]) => ({
                key: id,
                label: pick(gov(id)?.name),
                value: v.revenue,
                display: money(v.revenue),
                sub: tx(`${num(v.orders)} طلب`, `${num(v.orders)} orders`),
                to: `/admin/orders?gov=${id}`,
              }))}
            />
          </Pane>
          </>
          )}

          <Pane title={tx('آخر النشاطات', 'Recent activity')} flush>
            {recent.length ? (
              <ul className="list">
                {recent.map((a) => (
                  <li key={a.id} style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="small">{a.link ? <Link to={a.link}>{pick(a.what)}</Link> : pick(a.what)}</div>
                      <span className="tiny faint">
                        {a.who}{tx('، ', ', ')}<time dateTime={a.at} title={date(a.at, { dateStyle: 'medium', timeStyle: 'short' })}>{relTime(a.at)}</time>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('مفيش نشاط لسه.', 'No activity yet.')}
              </p>
            )}
          </Pane>
        </div>
      </div>
    </>
  )
}
