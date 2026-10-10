import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { PageHeader, Pane, PaymentBadge, Thumb } from '../ui'
import { isCounted, productSales } from '../../lib/metrics'
import { DAY, rng } from '../../lib/rand'
import { BarList } from '../parts/core/ui'
import { gov } from '../parts/core/lib'

/*
  A simulation of live storefront traffic for the demo. Visitor counts, pages,
  carts and the funnel are generated from a seeded random walk, shaped by the
  hour of day and weighted by the store's real sales mix. Orders shown are real.
  Replace `useSimulatedTraffic` with a feed from the analytics provider.
*/

const TICK_MS = 3000

/** Share of daily traffic by hour in Egypt: quiet mornings, evening peak. */
function hourCurve(h: number) {
  const curve = [0.35, 0.22, 0.14, 0.1, 0.08, 0.08, 0.12, 0.2, 0.32, 0.45, 0.55, 0.6, 0.62, 0.6, 0.58, 0.6, 0.66, 0.72, 0.8, 0.9, 1, 1, 0.9, 0.6]
  return curve[h] ?? 0.5
}

function useSimulatedTraffic() {
  const [tick, setTick] = useState(0)
  const [visitors, setVisitors] = useState(() => Math.round(20 + 70 * hourCurve(new Date().getHours())))
  useEffect(() => {
    const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''))
    const r = rng(seed)
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setVisitors((v) => {
        const target = 20 + 70 * hourCurve(new Date().getHours())
        const next = v + (target - v) * 0.15 + (r() - 0.5) * 8
        return Math.max(3, Math.round(next))
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])
  return { tick, visitors }
}

/** Distribute n across weights with a little seeded jitter; returns integers that sum to n. */
function split(n: number, weights: number[], r: () => number) {
  const jittered = weights.map((w) => w * (0.75 + r() * 0.5))
  const total = jittered.reduce((a, b) => a + b, 0) || 1
  const raw = jittered.map((w) => (w / total) * n)
  const out = raw.map(Math.floor)
  let left = n - out.reduce((a, b) => a + b, 0)
  raw
    .map((x, i) => ({ i, f: x - Math.floor(x) }))
    .sort((a, b) => b.f - a.f)
    .forEach(({ i }) => {
      if (left-- > 0) out[i]++
    })
  return out
}

const SOURCES = [
  { id: 'instagram', ar: 'إنستجرام', en: 'Instagram', w: 34 },
  { id: 'tiktok', ar: 'تيك توك', en: 'TikTok', w: 22 },
  { id: 'google', ar: 'بحث جوجل', en: 'Google search', w: 18 },
  { id: 'direct', ar: 'دخول مباشر', en: 'Direct', w: 14 },
  { id: 'whatsapp', ar: 'روابط واتساب', en: 'WhatsApp links', w: 12 },
]

export default function Live() {
  const { tx, pick, money, num, pct, relTime, date } = useI18n()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const { tick, visitors } = useSimulatedTraffic()

  // Real-data weights
  const weights = useMemo(() => {
    const now = Date.now()
    const govW = new Map<string, number>()
    let aovSum = 0
    let aovN = 0
    for (const o of orders) {
      if (!isCounted(o) || now - new Date(o.createdAt).getTime() > 30 * DAY) continue
      govW.set(o.governorateId, (govW.get(o.governorateId) ?? 0) + 1)
      aovSum += o.total
      aovN++
    }
    const govs = [...govW.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    const s30 = productSales(orders, now - 30 * DAY)
    const prods = [...s30.entries()]
      .sort((a, b) => b[1].units - a[1].units)
      .slice(0, 6)
      .map(([id, v]) => ({ p: products.find((x) => x.id === id), w: v.units }))
      .filter((x) => x.p && x.p.status === 'active')
    return { govs, prods, aov: aovN ? aovSum / aovN : 0 }
  }, [orders, products])

  const sim = useMemo(() => {
    const r = rng(1000 + tick)
    const govSplit = split(Math.round(visitors * 0.92), weights.govs.map(([, w]) => w), r)
    const viewing = Math.round(visitors * (0.55 + r() * 0.1))
    const prodSplit = split(viewing, weights.prods.map((x) => x.w), r)
    const carts = Math.max(0, Math.round(visitors * (0.1 + r() * 0.05)))
    const checkout = Math.max(0, Math.round(carts * (0.35 + r() * 0.15)))
    const srcSplit = split(visitors, SOURCES.map((s) => s.w), r)
    // Funnel: sessions in the last 30 minutes
    const sessions = Math.round(visitors * 4.2)
    const views = Math.round(sessions * (0.62 + r() * 0.06))
    const atc = Math.round(sessions * (0.11 + r() * 0.03))
    const co = Math.round(atc * (0.45 + r() * 0.1))
    const bought = Math.round(co * (0.52 + r() * 0.12))
    return { govSplit, prodSplit, carts, checkout, cartValue: carts * weights.aov, srcSplit, funnel: [sessions, views, atc, co, bought] }
  }, [tick, visitors, weights])

  const lastHour = useMemo(() => orders.filter((o) => Date.now() - new Date(o.createdAt).getTime() < 3600000).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders])
  const todayStats = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const os = orders.filter((o) => isCounted(o) && new Date(o.createdAt).getTime() >= d.getTime())
    return { n: os.length, total: os.reduce((a, o) => a + o.total, 0) }
  }, [orders])

  const funnelLabels = [
    tx('زيارات', 'Sessions'),
    tx('شافوا منتج', 'Viewed a product'),
    tx('أضافوا للسلة', 'Added to cart'),
    tx('بدأوا الدفع', 'Reached checkout'),
    tx('اشتروا', 'Purchased'),
  ]

  return (
    <>
      <PageHeader
        title={
          <span className="row" style={{ gap: 12 }}>
            <span className="core-pulse" aria-hidden />
            {tx('مباشر الآن', 'Live view')}
          </span>
        }
        description={tx('مين في المتجر دلوقتي وبيعمل إيه', 'Who is in the store right now and what they are doing')}
      />

      <div className="core-sim-note" role="note">
        <Info size={16} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
        <span>
          <strong>{tx('محاكاة للعرض، هتتوصل ببيانات الزيارات الحقيقية.', 'Simulated for the demo, connects to real traffic data.')}</strong>{' '}
          {tx(
            'أعداد الزوار والصفحات والسلال متولّدة ومتوزّعة حسب مبيعات المتجر الفعلية. الطلبات اللي تحت حقيقية.',
            'Visitor, page and cart numbers are generated and weighted by the store’s real sales mix. The orders below are real.',
          )}
        </span>
      </div>

      <div className="stack">
        <div className="ledger" style={{ ['--cols' as string]: 4 }}>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('زوار دلوقتي', 'Visitors right now')}</div>
            <div className="ledger__value" aria-live="polite">
              {num(visitors)}
            </div>
            <div className="ledger__meta">{tx('محاكاة، بتتحدّث كل 3 ثواني', 'Simulated, updates every 3 seconds')}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('سلال مفتوحة', 'Carts in progress')}</div>
            <div className="ledger__value">{num(sim.carts)}</div>
            <div className="ledger__meta">{tx(`حوالي ${money(sim.cartValue)}`, `About ${money(sim.cartValue)}`)}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('في صفحة الدفع', 'At checkout')}</div>
            <div className="ledger__value">{num(sim.checkout)}</div>
            <div className="ledger__meta">{tx('محاكاة', 'Simulated')}</div>
          </div>
          <Link className="ledger__cell" to="/admin/orders">
            <div className="ledger__label">{tx('طلبات النهارده', 'Orders today')}</div>
            <div className="ledger__value">{num(todayStats.n)}</div>
            <div className="ledger__meta">{tx(`${money(todayStats.total)}، بيانات حقيقية`, `${money(todayStats.total)}, real data`)}</div>
          </Link>
        </div>

        <div className="grid grid-2">
          <Pane title={tx('مسار الشراء', 'Checkout funnel')} description={tx('آخر 30 دقيقة، محاكاة', 'Last 30 minutes, simulated')} flush>
            <ol className="core-funnel" style={{ padding: '8px 0' }}>
              {sim.funnel.map((v, i) => (
                <li key={i}>
                  <span className="small">{funnelLabels[i]}</span>
                  <span className="core-funnel__bar" aria-hidden>
                    <span style={{ width: `${Math.max(1, (v / Math.max(1, sim.funnel[0])) * 100)}%` }} />
                  </span>
                  <span className="core-funnel__val">
                    <strong>{num(v)}</strong> <span className="faint">{i > 0 ? pct(v / Math.max(1, sim.funnel[i - 1]), 0) : ''}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="tiny faint" style={{ padding: '0 16px 12px' }}>
              {tx('النسبة جنب كل خطوة من الخطوة اللي قبلها.', 'Each percentage is relative to the step before it.')}
            </p>
          </Pane>

          <Pane title={tx('بيتفرّجوا على إيه', 'What they are looking at')} description={tx('زوار على صفحات المنتجات دلوقتي، محاكاة', 'Visitors on product pages now, simulated')} flush>
            {weights.prods.length ? (
              <ul className="list">
                {weights.prods.map(({ p }, i) => (
                  <li key={p!.id}>
                    <Thumb product={p!} />
                    <Link to={`/admin/products/${p!.id}`} className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
                      {pick(p!.name)}
                    </Link>
                    <span className="num strong">{num(sim.prodSplit[i] ?? 0)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('مفيش بيانات مبيعات كفاية.', 'Not enough sales data.')}
              </p>
            )}
          </Pane>

          <Pane title={tx('الزيارات حسب المحافظة', 'Sessions by governorate')} description={tx('محاكاة، موزّعة حسب طلبات آخر 30 يوم', 'Simulated, weighted by last-30-day orders')} flush>
            <BarList
              empty={tx('مفيش بيانات.', 'No data.')}
              rows={weights.govs.map(([id], i) => ({
                key: id,
                label: pick(gov(id)?.name),
                value: sim.govSplit[i] ?? 0,
                display: num(sim.govSplit[i] ?? 0),
              }))}
            />
          </Pane>

          <Pane title={tx('جايين منين', 'Where they came from')} description={tx('محاكاة', 'Simulated')} flush>
            <BarList
              rows={SOURCES.map((s, i) => ({
                key: s.id,
                label: tx(s.ar, s.en),
                value: sim.srcSplit[i] ?? 0,
                display: num(sim.srcSplit[i] ?? 0),
              }))}
            />
          </Pane>
        </div>

        <Pane
          title={tx('طلبات آخر ساعة', 'Orders in the last hour')}
          description={tx('بيانات حقيقية من المتجر', 'Real store data')}
          actions={
            <Link to="/admin/orders" className="btn btn--sm">
              {tx('كل الطلبات', 'All orders')}
            </Link>
          }
          flush
        >
          {lastHour.length ? (
            <ul className="list">
              {lastHour.map((o) => {
                const c = customers.find((x) => x.id === o.customerId)
                return (
                  <li key={o.id}>
                    <Link to={`/admin/orders/${o.id}`} className="strong num">
                      #{o.number}
                    </Link>
                    <span style={{ flex: 1, minWidth: 0 }} className="ellipsis">
                      {c ? pick(c.name) : ''} <span className="faint small">{pick(gov(o.governorateId)?.name)}</span>
                    </span>
                    <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />
                    <time className="small faint" dateTime={o.createdAt} title={date(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}>
                      {relTime(o.createdAt)}
                    </time>
                    <span className="num strong">{money(o.total)}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="muted small" style={{ padding: 16 }}>
              {tx('مفيش طلبات في آخر ساعة. أي طلب جديد من المتجر هيظهر هنا.', 'No orders in the last hour. New orders from the store show up here.')}
            </p>
          )}
        </Pane>
      </div>
    </>
  )
}
