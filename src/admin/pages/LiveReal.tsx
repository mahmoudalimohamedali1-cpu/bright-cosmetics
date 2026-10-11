import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { Bi } from '../../i18n'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import type { PaymentMethod, PaymentStatus } from '../../data/types'
import { PageHeader, Pane, PaymentBadge, Thumb } from '../ui'
import { BarList } from '../parts/core/ui'
import { gov } from '../parts/core/lib'

/*
  Live view on real first-party storefront events (server/analytics.ts),
  polled every 5 seconds. Shown when the dashboard is signed in to the API;
  Live.tsx keeps the labelled simulation for browser-only demo mode.
*/

type LiveData = {
  at: string
  activeSessions: number
  sessions30: number
  byPath: { path: string; views: number; sessions: number }[]
  byProduct: { productId: string; views: number; sessions: number }[]
  carts: { sessions: number; value: number }
  atCheckout: { sessions: number }
  sources: { key: string; sessions: number }[]
  funnelToday: { sessions: number; productViews: number; addToCart: number; checkout: number; purchase: number }
  ordersLastHour: { id: string; number: number; customer?: Bi; governorateId: string; payment: PaymentMethod; paymentStatus: PaymentStatus; total: number; createdAt: string }[]
  ordersToday: { count: number; total: number }
}

const POLL_MS = 5000

const SOURCE_LABEL: Record<string, [string, string]> = {
  instagram: ['إنستجرام', 'Instagram'],
  tiktok: ['تيك توك', 'TikTok'],
  search: ['محركات البحث', 'Search engines'],
  whatsapp: ['روابط واتساب', 'WhatsApp links'],
  facebook: ['فيسبوك', 'Facebook'],
  direct: ['دخول مباشر', 'Direct'],
  other: ['مواقع تانية', 'Other sites'],
}

export default function RealLive() {
  const { tx, pick, money, num, pct, relTime, date } = useI18n()
  const products = useStore((s) => s.products)
  const [data, setData] = useState<LiveData>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    const tick = () =>
      api<LiveData>('/api/admin/live', { admin: true })
        .then((d) => {
          if (!alive) return
          setData(d)
          setFailed(false)
        })
        .catch(() => {
          if (alive) setFailed(true)
        })
    void tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const pathLabel = (p: string) => {
    if (p === '/') return tx('الرئيسية', 'Home')
    if (p === '/checkout') return tx('إتمام الطلب', 'Checkout')
    if (p.startsWith('/p/')) {
      const prod = products.find((x) => x.slug === decodeURIComponent(p.slice(3)))
      return prod ? pick(prod.name) : p
    }
    return p
  }

  const f = data?.funnelToday
  const steps = f ? [f.sessions, f.productViews, f.addToCart, f.checkout, f.purchase] : [0, 0, 0, 0, 0]
  const funnelLabels = [tx('زيارات', 'Sessions'), tx('شافوا منتج', 'Viewed a product'), tx('أضافوا للسلة', 'Added to cart'), tx('بدأوا الدفع', 'Reached checkout'), tx('اشتروا', 'Purchased')]
  const src = (k: string) => {
    const l = SOURCE_LABEL[k]
    return l ? tx(l[0], l[1]) : k
  }

  return (
    <>
      <PageHeader
        title={
          <span className="row" style={{ gap: 12 }}>
            <span className="core-pulse" aria-hidden />
            {tx('مباشر الآن', 'Live view')}
          </span>
        }
        description={tx('مين في المتجر دلوقتي وبيعمل إيه، من زيارات المتجر الفعلية', 'Who is in the store right now and what they are doing, from real storefront visits')}
      />

      {failed && (
        <div className="core-sim-note" role="alert">
          <Info size={16} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
          <span>{tx('مش قادرين نوصل للسيرفر. الأرقام اللي تحت ممكن تكون قديمة.', 'Cannot reach the server. The numbers below may be out of date.')}</span>
        </div>
      )}

      <div className="stack">
        <div className="ledger" style={{ ['--cols' as string]: 4 }}>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('زوار دلوقتي', 'Visitors right now')}</div>
            <div className="ledger__value" aria-live="polite">
              {data ? num(data.activeSessions) : '…'}
            </div>
            <div className="ledger__meta">{tx('زيارات نشطة آخر 5 دقايق، بتتحدّث كل 5 ثواني', 'Active in the last 5 minutes, updates every 5 seconds')}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('سلال مفتوحة', 'Carts in progress')}</div>
            <div className="ledger__value">{data ? num(data.carts.sessions) : '…'}</div>
            <div className="ledger__meta">{data ? tx(`حوالي ${money(data.carts.value)}، آخر 30 دقيقة`, `About ${money(data.carts.value)}, last 30 minutes`) : ''}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('في صفحة الدفع', 'At checkout')}</div>
            <div className="ledger__value">{data ? num(data.atCheckout.sessions) : '…'}</div>
            <div className="ledger__meta">{tx('بدأوا الدفع ولسه ما اشتروش', 'Started checkout, not purchased yet')}</div>
          </div>
          <Link className="ledger__cell" to="/admin/orders">
            <div className="ledger__label">{tx('طلبات النهارده', 'Orders today')}</div>
            <div className="ledger__value">{data ? num(data.ordersToday.count) : '…'}</div>
            <div className="ledger__meta">{data ? money(data.ordersToday.total) : ''}</div>
          </Link>
        </div>

        <div className="grid grid-2">
          <Pane title={tx('مسار الشراء', 'Checkout funnel')} description={tx('النهارده، عدد الزيارات اللي وصلت لكل خطوة', 'Today, distinct sessions reaching each step')} flush>
            <ol className="core-funnel" style={{ padding: '8px 0' }}>
              {steps.map((v, i) => (
                <li key={i}>
                  <span className="small">{funnelLabels[i]}</span>
                  <span className="core-funnel__bar" aria-hidden>
                    <span style={{ width: `${Math.max(1, (v / Math.max(1, steps[0])) * 100)}%` }} />
                  </span>
                  <span className="core-funnel__val">
                    <strong>{num(v)}</strong> <span className="faint">{i > 0 ? pct(v / Math.max(1, steps[i - 1]), 0) : ''}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="tiny faint" style={{ padding: '0 16px 12px' }}>
              {tx('النسبة جنب كل خطوة من الخطوة اللي قبلها. الزيارات اللي طالبة عدم التتبع مش محسوبة.', 'Each percentage is relative to the step before it. Visits that ask not to be tracked are not counted.')}
            </p>
          </Pane>

          <Pane title={tx('بيتفرّجوا على إيه', 'What they are looking at')} description={tx('مشاهدات صفحات المنتجات، آخر 30 دقيقة', 'Product page views, last 30 minutes')} flush>
            {data?.byProduct.length ? (
              <ul className="list">
                {data.byProduct.map((r) => {
                  const p = products.find((x) => x.id === r.productId)
                  return (
                    <li key={r.productId}>
                      {p && <Thumb product={p} />}
                      {p ? (
                        <Link to={`/admin/products/${p.id}`} className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
                          {pick(p.name)}
                        </Link>
                      ) : (
                        <span className="ellipsis" style={{ flex: 1, minWidth: 0 }}>
                          {r.productId}
                        </span>
                      )}
                      <span className="num strong">{num(r.views)}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('محدش فتح صفحة منتج في آخر 30 دقيقة.', 'Nobody opened a product page in the last 30 minutes.')}
              </p>
            )}
          </Pane>

          <Pane title={tx('الصفحات', 'Pages')} description={tx('مشاهدات آخر 30 دقيقة', 'Views in the last 30 minutes')} flush>
            <BarList
              empty={tx('مفيش زيارات في آخر 30 دقيقة.', 'No visits in the last 30 minutes.')}
              rows={(data?.byPath ?? []).map((r) => ({ key: r.path, label: <bdi>{pathLabel(r.path)}</bdi>, value: r.views, display: num(r.views) }))}
            />
          </Pane>

          <Pane title={tx('جايين منين', 'Where they came from')} description={tx('حسب الموقع اللي جابهم، آخر 30 دقيقة', 'By referring site, last 30 minutes')} flush>
            <BarList
              empty={tx('مفيش زيارات في آخر 30 دقيقة.', 'No visits in the last 30 minutes.')}
              rows={(data?.sources ?? []).map((r) => ({ key: r.key, label: src(r.key), value: r.sessions, display: num(r.sessions) }))}
            />
          </Pane>
        </div>

        <Pane
          title={tx('طلبات آخر ساعة', 'Orders in the last hour')}
          description={data ? tx(`آخر تحديث ${date(data.at, { timeStyle: 'medium' })}`, `Updated ${date(data.at, { timeStyle: 'medium' })}`) : undefined}
          actions={
            <Link to="/admin/orders" className="btn btn--sm">
              {tx('كل الطلبات', 'All orders')}
            </Link>
          }
          flush
        >
          {data?.ordersLastHour.length ? (
            <ul className="list">
              {data.ordersLastHour.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="strong num">
                    #{o.number}
                  </Link>
                  <span style={{ flex: 1, minWidth: 0 }} className="ellipsis">
                    {o.customer ? pick(o.customer) : ''} <span className="faint small">{pick(gov(o.governorateId)?.name)}</span>
                  </span>
                  <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />
                  <time className="small faint" dateTime={o.createdAt} title={date(o.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}>
                    {relTime(o.createdAt)}
                  </time>
                  <span className="num strong">{money(o.total)}</span>
                </li>
              ))}
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
