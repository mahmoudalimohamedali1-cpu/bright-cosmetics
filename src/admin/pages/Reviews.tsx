import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BadgeCheck, Eye, EyeOff, MessageSquareReply, Search, Star } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { SKIN_LABEL } from '../../data/catalog'
import type { Review } from '../../data/types'
import { Badge, DemoNote, Empty, PageHeader, Pane, Tabs, Thumb, useAdmin } from '../ui'
import { LedgerCell, Stars, Takeaway } from '../parts/growth'

type Tab = Review['status']
const PAGE = 20

export default function Reviews() {
  const { tx, pick, num, pct, relTime, date } = useI18n()
  const { toast, staff } = useAdmin()
  const reviews = useStore((s) => s.reviews)
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const setReviewStatus = useStore((s) => s.setReviewStatus)
  const replyReview = useStore((s) => s.replyReview)
  const log = useStore((s) => s.log)
  const [params, setParams] = useSearchParams()
  const tab = (['pending', 'published', 'hidden'].includes(params.get('tab') ?? '') ? params.get('tab') : 'pending') as Tab
  const [stars, setStars] = useState(0)
  const [q, setQ] = useState('')
  const [replying, setReplying] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const counts = useMemo(() => {
    const c = { pending: 0, published: 0, hidden: 0 }
    reviews.forEach((r) => c[r.status]++)
    return c
  }, [reviews])

  const published = reviews.filter((r) => r.status === 'published')
  const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonth = reviews.filter((r) => new Date(r.createdAt) >= monthStart).length
  const replied = published.filter((r) => r.reply).length
  const low = reviews.filter((r) => r.rating <= 3)
  const lowUnreplied = low.filter((r) => !r.reply && r.status !== 'hidden').length

  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }))
  const distMax = Math.max(1, ...dist.map((d) => d.count))

  const worstProduct = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>()
    published.forEach((r) => {
      const e = m.get(r.productId) ?? { sum: 0, n: 0 }
      e.sum += r.rating
      e.n++
      m.set(r.productId, e)
    })
    const list = [...m.entries()].filter(([, v]) => v.n >= 3).map(([id, v]) => ({ id, avg: v.sum / v.n, n: v.n }))
    return list.sort((a, b) => a.avg - b.avg)[0]
  }, [published])

  const rows = reviews
    .filter((r) => r.status === tab && (!stars || r.rating === stars))
    .filter((r) => {
      if (!q.trim()) return true
      const s = q.trim().toLowerCase()
      const p = products.find((x) => x.id === r.productId)
      return `${r.title} ${r.body} ${p?.name.en ?? ''} ${p?.name.ar ?? ''} ${p?.brand ?? ''}`.toLowerCase().includes(s)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const setTab = (t: Tab) => {
    const n = new URLSearchParams(params)
    n.set('tab', t)
    setParams(n, { replace: true })
    setLimit(PAGE)
  }

  const act = (r: Review, s: Review['status']) => {
    setReviewStatus(r.id, s)
    const p = products.find((x) => x.id === r.productId)
    log(staff, { ar: `${s === 'published' ? 'نشر' : 'أخفى'} تقييم على ${p?.name.ar ?? ''}`, en: `${s === 'published' ? 'Published' : 'Hid'} a review of ${p?.name.en ?? ''}` }, `/admin/reviews?tab=${s}`)
    toast(s === 'published' ? tx('تم نشر التقييم', 'Review published') : tx('تم إخفاء التقييم', 'Review hidden'))
  }

  const saveReply = (r: Review) => {
    const text = draft.trim()
    if (!text) return
    replyReview(r.id, text)
    toast(tx('تم حفظ الرد', 'Reply saved'))
    setReplying(null)
    setDraft('')
  }

  return (
    <>
      <PageHeader
        title={tx('التقييمات', 'Reviews')}
        description={
          <>
            {tx('مراجعة التقييمات قبل ما تظهر في المتجر، والرد عليها. ', 'Moderate reviews before they appear in the store, and reply. ')}
            <DemoNote />
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell
          label={tx('متوسط التقييم', 'Average rating')}
          value={
            <span className="row" style={{ gap: 8 }}>
              {num(avg, { maximumFractionDigits: 2 })}
              <Stars value={avg} size={16} />
            </span>
          }
          meta={tx(`من ${num(published.length)} تقييم منشور`, `From ${num(published.length)} published reviews`)}
        />
        <LedgerCell label={tx('تقييمات الشهر ده', 'Reviews this month')} value={num(thisMonth)} />
        <LedgerCell label={tx('في انتظار المراجعة', 'Waiting for review')} value={num(counts.pending)} to="/admin/reviews?tab=pending" />
        <LedgerCell label={tx('نسبة الرد', 'Reply rate')} value={pct(published.length ? replied / published.length : 0, 0)} meta={tx(`${num(lowUnreplied)} تقييم 3 نجوم أو أقل من غير رد`, `${num(lowUnreplied)} reviews of 3 stars or less without a reply`)} />
      </div>

      <div className="grid grid-main">
        <section className="pane pane--flush">
          <div style={{ padding: '0 12px' }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'pending', label: tx('في الانتظار', 'Pending'), count: counts.pending },
                { value: 'published', label: tx('منشورة', 'Published'), count: counts.published },
                { value: 'hidden', label: tx('مخفية', 'Hidden'), count: counts.hidden },
              ]}
            />
          </div>
          <div className="toolbar">
            <div className="input-group" style={{ flex: '1 1 220px', maxWidth: 320 }}>
              <span className="addon">
                <Search size={14} aria-hidden />
              </span>
              <input className="input" style={{ height: 34 }} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx('بحث في النص أو المنتج', 'Search text or product')} aria-label={tx('بحث في التقييمات', 'Search reviews')} />
            </div>
            {stars > 0 && (
              <button className="gr-chip" aria-pressed="true" onClick={() => setStars(0)}>
                {tx(`${stars} نجوم فقط`, `${stars} stars only`)} ✕
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <Empty title={tab === 'pending' ? tx('مفيش تقييمات مستنية', 'Nothing waiting for review') : tx('مفيش تقييمات هنا', 'No reviews here')}>
              {tab === 'pending' ? tx('التقييمات الجديدة من المتجر بتظهر هنا قبل النشر.', 'New reviews from the store land here before publishing.') : tx('جرّب تشيل الفلتر أو البحث.', 'Try removing the filter or search.')}
            </Empty>
          ) : (
            <div>
              {rows.slice(0, limit).map((r) => {
                const p = products.find((x) => x.id === r.productId)
                const c = customers.find((x) => x.id === r.customerId)
                const rd = r.lang === 'ar' ? 'rtl' : 'ltr'
                return (
                  <article key={r.id} className="gr-review">
                    {p ? (
                      <Link to={`/admin/products/${p.id}`} aria-label={pick(p.name)}>
                        <Thumb product={p} />
                      </Link>
                    ) : (
                      <span />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ minWidth: 0 }}>
                          <Stars value={r.rating} />
                          {p && (
                            <Link to={`/admin/products/${p.id}`} className="small strong" style={{ color: 'inherit', display: 'block' }}>
                              {pick(p.name)}
                            </Link>
                          )}
                        </div>
                        <span className="tiny faint" title={date(r.createdAt)}>
                          {relTime(r.createdAt)}
                        </span>
                      </div>
                      <div dir={rd} lang={r.lang} style={{ marginTop: 8 }}>
                        <div className="strong">{r.title}</div>
                        <p className="small muted" style={{ marginTop: 2 }}>
                          {r.body}
                        </p>
                      </div>
                      <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                        {c && (
                          <Link to={`/admin/customers/${c.id}`} className="tiny">
                            {pick(c.name)}
                          </Link>
                        )}
                        <Badge plain>{tx(`بشرة ${SKIN_LABEL[r.skinType].ar}`, `${SKIN_LABEL[r.skinType].en} skin`)}</Badge>
                        {r.verified && (
                          <Badge tone="ok" plain>
                            <BadgeCheck size={12} aria-hidden />
                            {tx('مشتري موثّق', 'Verified buyer')}
                          </Badge>
                        )}
                      </div>
                      {r.reply && replying !== r.id && (
                        <div className="gr-review__reply">
                          <div className="tiny faint" style={{ marginBottom: 2 }}>
                            {tx('رد المتجر', 'Store reply')}
                          </div>
                          <div dir="auto">{r.reply}</div>
                        </div>
                      )}
                      {replying === r.id && (
                        <form
                          className="stack"
                          style={{ gap: 8, marginTop: 10 }}
                          onSubmit={(e) => {
                            e.preventDefault()
                            saveReply(r)
                          }}
                        >
                          <textarea
                            className="textarea"
                            dir={rd}
                            lang={r.lang}
                            autoFocus
                            rows={3}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder={r.lang === 'ar' ? 'شكرًا على تقييمك…' : 'Thank you for your review…'}
                            aria-label={tx('نص الرد', 'Reply text')}
                          />
                          <div className="row">
                            <button className="btn btn--primary btn--sm" type="submit" disabled={!draft.trim()}>
                              {tx('حفظ الرد', 'Save reply')}
                            </button>
                            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setReplying(null)}>
                              {tx('إلغاء', 'Cancel')}
                            </button>
                            <span className="tiny faint">{r.lang === 'ar' ? tx('الرد بنفس لغة التقييم: عربي', 'Reply in the review’s language: Arabic') : tx('الرد بنفس لغة التقييم: إنجليزي', 'Reply in the review’s language: English')}</span>
                          </div>
                        </form>
                      )}
                      {replying !== r.id && (
                        <div className="row" style={{ marginTop: 10, gap: 6 }}>
                          {r.status !== 'published' && (
                            <button className="btn btn--sm btn--primary" onClick={() => act(r, 'published')}>
                              <Eye size={14} aria-hidden />
                              {tx('نشر', 'Publish')}
                            </button>
                          )}
                          {r.status !== 'hidden' && (
                            <button className="btn btn--sm" onClick={() => act(r, 'hidden')}>
                              <EyeOff size={14} aria-hidden />
                              {tx('إخفاء', 'Hide')}
                            </button>
                          )}
                          <button
                            className="btn btn--sm btn--ghost"
                            onClick={() => {
                              setReplying(r.id)
                              setDraft(r.reply ?? '')
                            }}
                          >
                            <MessageSquareReply size={14} aria-hidden />
                            {r.reply ? tx('تعديل الرد', 'Edit reply') : tx('رد', 'Reply')}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          {rows.length > limit && (
            <div className="pane__foot">
              <span className="num">{tx(`عرض ${num(limit)} من ${num(rows.length)}`, `Showing ${num(limit)} of ${num(rows.length)}`)}</span>
              <button className="btn btn--sm" onClick={() => setLimit((l) => l + PAGE)}>
                {tx('عرض المزيد', 'Show more')}
              </button>
            </div>
          )}
        </section>

        <div className="stack">
          <Pane title={tx('توزيع النجوم', 'Rating distribution')} description={tx('كل التقييمات، الضغط على صف بيفلتر القائمة', 'All reviews; select a row to filter the list')}>
            <Takeaway>
              <strong>{pct(reviews.length ? (dist[0].count + dist[1].count) / reviews.length : 0, 0)}</strong>
              {tx(' من التقييمات 4 أو 5 نجوم.', ' of reviews are 4 or 5 stars.')}
              {worstProduct && (
                <>
                  {tx(' أقل منتج تقييمًا: ', ' Lowest-rated product: ')}
                  <Link to={`/admin/products/${worstProduct.id}`}>{pick(products.find((p) => p.id === worstProduct.id)?.name)}</Link>
                  {tx(` (${num(worstProduct.avg, { maximumFractionDigits: 1 })} من ${num(worstProduct.n)} تقييم).`, ` (${num(worstProduct.avg, { maximumFractionDigits: 1 })} from ${num(worstProduct.n)} reviews).`)}
                </>
              )}
            </Takeaway>
            <div className="gr-dist">
              {dist.map((d) => (
                <button key={d.n} aria-pressed={stars === d.n} onClick={() => setStars(stars === d.n ? 0 : d.n)} aria-label={tx(`${d.n} نجوم: ${d.count}`, `${d.n} stars: ${d.count}`)}>
                  <span className="row num" style={{ gap: 4 }}>
                    {d.n}
                    <Star size={12} className="gr-star-on" aria-hidden />
                  </span>
                  <span className="gr-bars__track">
                    <span className="gr-bars__fill" style={{ width: `${(d.count / distMax) * 100}%` }} />
                  </span>
                  <span className="num small" style={{ textAlign: 'end' }}>
                    {num(d.count)} <span className="faint">{pct(reviews.length ? d.count / reviews.length : 0, 0)}</span>
                  </span>
                </button>
              ))}
            </div>
          </Pane>
          <Pane title={tx('ملاحظة', 'Note')}>
            <p className="small muted">{tx('الصور مع التقييمات مش مدعومة لسه في المتجر، فنسبة التقييمات بالصور غير متاحة.', 'Photo reviews are not supported in the store yet, so the share of reviews with photos isn’t available.')}</p>
          </Pane>
        </div>
      </div>
    </>
  )
}
