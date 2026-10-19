import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Mail, MessageCircle, Phone, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { GOVERNORATES } from '../../data/seed'
import { CONCERN_LABEL, SKIN_LABEL } from '../../data/catalog'
import { isCounted, netRevenue, SEGMENT_LABEL } from '../../lib/metrics'
import { DAY } from '../../lib/rand'
import type { Concern, Product, SkinType } from '../../data/types'
import { Avatar, DemoNote, Empty, FulfillmentBadge, OrderStatusBadge, PageHeader, Pane, PaymentBadge, Switch, Thumb, useAdmin } from '../ui'
import { LedgerCell, SegmentBadge, Stars, useCustomerStats } from '../parts/growth'
import { CONSUMABLE, firstName, waLink } from '../parts/growth/util'
import { useCategories } from '../../lib/useCategories'

export default function CustomerDetail() {
  const { id } = useParams()
  const { hash } = useLocation()
  const { tx, pick, money, num, date, relTime, lang } = useI18n()
  const { label: catLabel } = useCategories()
  const { toast, staff, can } = useAdmin()
  const readOnly = !can('customers.edit')
  const stats = useCustomerStats()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const reviews = useStore((s) => s.reviews)
  const upsertCustomer = useStore((s) => s.upsertCustomer)
  const log = useStore((s) => s.log)

  const st = stats.find((s) => s.customer.id === id)
  const c = st?.customer

  const [note, setNote] = useState(c?.note ?? '')
  const [tagDraft, setTagDraft] = useState('')
  useEffect(() => setNote(c?.note ?? ''), [c?.id, c?.note])

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash, c?.id])

  const myOrders = useMemo(() => orders.filter((o) => o.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders, id])
  const counted = myOrders.filter(isCounted)
  const myReviews = reviews.filter((r) => r.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  /* Next order estimate: average gap between counted orders */
  const forecast = useMemo(() => {
    if (counted.length < 2) return null
    const ts = counted.map((o) => new Date(o.createdAt).getTime()).sort((a, b) => a - b)
    const gap = (ts[ts.length - 1] - ts[0]) / (ts.length - 1)
    const next = ts[ts.length - 1] + gap
    return { gapDays: Math.round(gap / DAY), next, overdueDays: Math.floor((Date.now() - next) / DAY) }
  }, [counted])

  /* Recommendations */
  const rec = useMemo(() => {
    if (!c) return { running: [], next: [] as { p: Product; why: string[] }[] }
    const lastBought = new Map<string, number>()
    for (const o of counted) {
      if (o.fulfillment === 'returned') continue
      for (const l of o.lines) lastBought.set(l.productId, Math.max(lastBought.get(l.productId) ?? 0, new Date(o.createdAt).getTime()))
    }
    const running = [...lastBought.entries()]
      .map(([pid, t]) => ({ p: products.find((x) => x.id === pid), days: Math.floor((Date.now() - t) / DAY) }))
      .filter((x): x is { p: Product; days: number } => !!x.p && CONSUMABLE.has(x.p.category) && x.days >= 45 && x.days <= 75)
      .sort((a, b) => b.days - a.days)
      .slice(0, 3)
    const next = products
      .filter((p) => p.status === 'active' && !lastBought.has(p.id) && p.skinTypes.includes(c.skinType))
      .map((p) => {
        const hits = p.concerns.filter((k) => c.concerns.includes(k))
        return { p, hits, score: hits.length * 2 + p.rating }
      })
      .filter((x) => x.hits.length > 0 || c.concerns.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ p, hits }) => ({ p, why: [pick(SKIN_LABEL[c.skinType]), ...hits.map((h) => pick(CONCERN_LABEL[h]))] }))
    return { running, next }
  }, [c, counted, products, pick])

  if (!c || !st) {
    return (
      <>
        <PageHeader title={tx('العميل', 'Customer')} back={{ to: '/admin/customers', label: tx('العملاء', 'Customers') }} />
        <Empty title={tx('العميل ده مش موجود', 'Customer not found')} action={<Link className="btn" to="/admin/customers">{tx('كل العملاء', 'All customers')}</Link>}>
          {tx('ممكن يكون اتمسح مع إعادة ضبط البيانات التجريبية.', 'It may have been removed when the demo data was reset.')}
        </Empty>
      </>
    )
  }

  const gov = GOVERNORATES.find((g) => g.id === c.governorateId)
  const save = (patch: Partial<typeof c>, msg: string) => {
    upsertCustomer({ ...c, ...patch })
    toast(msg)
  }
  const addTag = () => {
    const t = tagDraft.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t || c.tags.includes(t)) return setTagDraft('')
    save({ tags: [...c.tags, t] }, tx('تمت إضافة الوسم', 'Tag added'))
    setTagDraft('')
  }
  const toggleConcern = (k: Concern) =>
    save({ concerns: c.concerns.includes(k) ? c.concerns.filter((x) => x !== k) : [...c.concerns, k] }, tx('تم تحديث ملف البشرة', 'Skin profile updated'))

  const nm = firstName(c.name[lang])
  const recMsg =
    rec.running.length || rec.next.length
      ? lang === 'ar'
        ? `أهلًا ${nm}، معاكي برايت.\n${rec.running.length ? `غالبًا ${rec.running.map((x) => x.p.name.ar).join(' و')} قرّب يخلص، تحبي نجهّزلك واحد جديد؟\n` : ''}${rec.next.length ? `ولبشرتك ال${SKIN_LABEL[c.skinType].ar} ممكن يعجبك: ${rec.next.slice(0, 2).map((x) => x.p.name.ar).join('، ')}.` : ''}`
        : `Hi ${nm}, it’s Bright.\n${rec.running.length ? `Your ${rec.running.map((x) => x.p.name.en).join(' and ')} is probably running low. Shall we send a fresh one?\n` : ''}${rec.next.length ? `For your ${SKIN_LABEL[c.skinType].en.toLowerCase()} skin you might like: ${rec.next.slice(0, 2).map((x) => x.p.name.en).join(', ')}.` : ''}`
      : ''

  return (
    <>
      <PageHeader
        back={{ to: '/admin/customers', label: tx('العملاء', 'Customers') }}
        title={
          <span className="row" style={{ gap: 12 }}>
            <Avatar name={pick(c.name)} />
            {pick(c.name)}
            <SegmentBadge s={st.segment} />
          </span>
        }
        description={
          <>
            {tx(`${gov ? pick(gov.name) : ''}، عميل من ${date(c.createdAt)}. `, `${gov ? pick(gov.name) : ''}, customer since ${date(c.createdAt)}. `)}
            <DemoNote />
          </>
        }
        actions={
          <>
            {c.email && (
              <a className="btn" href={`mailto:${c.email}`}>
                <Mail size={16} aria-hidden />
                {tx('بريد', 'Email')}
              </a>
            )}
            {!readOnly && (
              <a className="btn btn--live" href={waLink(c.phone)} target="_blank" rel="noreferrer">
                <MessageCircle size={16} aria-hidden />
                {tx('واتساب', 'WhatsApp')}
              </a>
            )}
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 5, marginBottom: 16 }}>
        <LedgerCell label={tx('إجمالي الصرف', 'Lifetime spend')} value={money(st.spent)} meta={tx('صافي، بدون الشحن والملغي والمرتجع', 'Net, excl. shipping, cancelled, returned')} />
        <LedgerCell label={tx('الطلبات', 'Orders')} value={num(st.orders)} meta={myOrders.length > st.orders ? tx(`+${num(myOrders.length - st.orders)} ملغي`, `+${num(myOrders.length - st.orders)} cancelled`) : undefined} to="#orders" />
        <LedgerCell label={tx('متوسط الطلب', 'Average order')} value={st.orders ? money(st.aov) : '—'} />
        <LedgerCell
          label={tx('الطلب الجاي (تقدير)', 'Next order (estimate)')}
          value={forecast ? date(forecast.next, { day: 'numeric', month: 'short' }) : '—'}
          meta={
            forecast
              ? forecast.overdueDays > 0
                ? tx(`متأخر ${num(forecast.overdueDays)} يوم عن معدّله (كل ${num(forecast.gapDays)} يوم)`, `${num(forecast.overdueDays)} days past their usual ${num(forecast.gapDays)}-day rhythm`)
                : tx(`متوسط الفترة بين الطلبات ${num(forecast.gapDays)} يوم`, `Average gap between orders: ${num(forecast.gapDays)} days`)
              : tx('محتاج طلبين على الأقل', 'Needs at least two orders')
          }
        />
        <LedgerCell
          label={tx('تقييم RFM', 'RFM score')}
          value={st.orders ? <span className="num">{`${st.r}-${st.f}-${st.m}`}</span> : '—'}
          meta={st.orders ? tx('حداثة، تكرار، قيمة (من 5)', 'Recency, frequency, monetary (of 5)') : undefined}
          to={`/admin/customers?segment=${st.segment}`}
        />
      </div>

      <div className="grid grid-main">
        <div className="stack">
          <Pane title={tx('الخطوة الجاية معاه', 'What to offer next')} description={pick(SEGMENT_LABEL[st.segment].hint)}>
            {rec.running.length === 0 && rec.next.length === 0 ? (
              <p className="muted small">{tx('مفيش منتجات مطابقة لنوع البشرة والاهتمامات ولسه ما اشتراهاش.', 'No unbought products match this skin type and concerns.')}</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {rec.running.map(({ p, days }) => (
                  <div key={p.id} className="row" style={{ gap: 12 }}>
                    <Thumb product={p} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="small">
                        <span className="strong">{tx('غالبًا قرّب يخلص: ', 'Likely running out: ')}</span>
                        <Link to={`/admin/products/${p.id}`}>{pick(p.name)}</Link>
                      </div>
                      <div className="tiny faint">{tx(`اتشرى من ${num(days)} يوم، وعبوة ${p.size} بتكفي حوالي 6–8 أسابيع عادةً`, `Bought ${num(days)} days ago; a ${p.size} pack usually lasts 6–8 weeks`)}</div>
                    </div>
                    <span className="num small">{money(p.price)}</span>
                  </div>
                ))}
                {rec.next.map(({ p, why }) => (
                  <div key={p.id} className="row" style={{ gap: 12 }}>
                    <Thumb product={p} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link to={`/admin/products/${p.id}`} className="small strong" style={{ color: 'inherit' }}>
                        {pick(p.name)}
                      </Link>
                      <div className="tiny faint">
                        {p.brand}، {pick(catLabel(p.category))}. {tx('مناسب لـ: ', 'Matches: ')}
                        {why.join('، ')}
                      </div>
                    </div>
                    <span className="num small">{money(p.price)}</span>
                  </div>
                ))}
                {recMsg && !readOnly && (
                  <div>
                    <a className="btn btn--sm" href={waLink(c.phone, recMsg)} target="_blank" rel="noreferrer">
                      <MessageCircle size={14} aria-hidden />
                      {tx('اقتراح على واتساب', 'Suggest on WhatsApp')}
                    </a>
                  </div>
                )}
              </div>
            )}
          </Pane>

          <Pane title={tx('الطلبات', 'Orders')} flush id="orders">
            {myOrders.length === 0 ? (
              <Empty title={tx('لسه ما طلبش', 'No orders yet')}>{tx('أول طلب هيظهر هنا.', 'The first order will show here.')}</Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{tx('الطلب', 'Order')}</th>
                      <th>{tx('التاريخ', 'Date')}</th>
                      <th className="gr-hide-md">{tx('المنتجات', 'Items')}</th>
                      <th>{tx('الحالة', 'Status')}</th>
                      <th>{tx('الدفع', 'Payment')}</th>
                      <th>{tx('التجهيز', 'Fulfilment')}</th>
                      <th className="t-num">{tx('الإجمالي', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/admin/orders/${o.id}`} className="strong num">
                            #{o.number}
                          </Link>
                        </td>
                        <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                          {date(o.createdAt)}
                        </td>
                        <td className="gr-hide-md">
                          <div className="gr-thumbs">
                            {o.lines.slice(0, 3).map((l) => {
                              const p = products.find((x) => x.id === l.productId)
                              return p ? <Thumb key={l.productId} product={p} /> : null
                            })}
                            {o.lines.length > 3 && <span className="tiny faint">+{o.lines.length - 3}</span>}
                          </div>
                        </td>
                        <td>
                          <OrderStatusBadge s={o.status} />
                        </td>
                        <td>
                          <PaymentBadge s={o.paymentStatus} cod={o.payment === 'cod'} />
                        </td>
                        <td>
                          <FulfillmentBadge s={o.fulfillment} />
                        </td>
                        <td className="t-num">
                          {money(o.total)}
                          {o.discountCode && <div className="tiny faint gr-code">{o.discountCode}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {counted.length > 0 && (
              <div className="pane__foot">
                <span>{tx('الصافي من الطلبات المحسوبة', 'Net from counted orders')}</span>
                <strong className="num">{money(counted.reduce((s, o) => s + netRevenue(o), 0))}</strong>
              </div>
            )}
          </Pane>

          <Pane title={tx('تقييماته', 'Their reviews')} flush>
            {myReviews.length === 0 ? (
              <p className="muted small" style={{ padding: 16 }}>
                {tx('ما كتبش تقييمات لسه.', 'No reviews written yet.')}
              </p>
            ) : (
              <ul className="list">
                {myReviews.map((r) => {
                  const p = products.find((x) => x.id === r.productId)
                  return (
                    <li key={r.id} style={{ alignItems: 'flex-start' }}>
                      {p && <Thumb product={p} />}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="row-between">
                          <Stars value={r.rating} />
                          <span className="tiny faint">{relTime(r.createdAt)}</span>
                        </div>
                        <div className="strong small" dir={r.lang === 'ar' ? 'rtl' : 'ltr'} lang={r.lang}>
                          {r.title}
                        </div>
                        <div className="small muted" dir={r.lang === 'ar' ? 'rtl' : 'ltr'} lang={r.lang}>
                          {r.body}
                        </div>
                        <Link to={`/admin/reviews?tab=${r.status}`} className="tiny">
                          {p ? pick(p.name) : ''}
                        </Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Pane>
        </div>

        <div className="stack">
          <Pane title={tx('بيانات التواصل', 'Contact')}>
            <dl className="gr-kv">
              <dt>
                <Phone size={14} aria-label={tx('تليفون', 'Phone')} />
              </dt>
              <dd className="num gr-ltr">
                <a href={`tel:${c.phone}`}>{c.phone}</a>
              </dd>
              <dt>
                <Mail size={14} aria-label={tx('بريد', 'Email')} />
              </dt>
              <dd className="small">{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className="faint">{tx('غير متوفر', 'Not provided')}</span>}</dd>
              <dt>{tx('المحافظة', 'Governorate')}</dt>
              <dd>
                <Link to={`/admin/customers?gov=${c.governorateId}`}>{gov ? pick(gov.name) : c.governorateId}</Link>
              </dd>
            </dl>
            <fieldset disabled={readOnly} className="gr-toggle-row adm-readonly" style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div>
                <div className="small strong">{tx('موافق على رسائل التسويق', 'Accepts marketing')}</div>
                <div className="tiny faint">{tx('العروض على واتساب والبريد', 'Offers by WhatsApp and email')}</div>
              </div>
              <Switch
                checked={c.acceptsMarketing}
                onChange={(v) => {
                  save({ acceptsMarketing: v }, v ? tx('تم تسجيل الموافقة', 'Consent recorded') : tx('تم إلغاء الموافقة', 'Consent withdrawn'))
                  log(staff, { ar: `${v ? 'سجّل' : 'ألغى'} موافقة التسويق لـ ${c.name.ar}`, en: `${v ? 'Recorded' : 'Withdrew'} marketing consent for ${c.name.en}` }, `/admin/customers/${c.id}`)
                }}
                label={tx('موافق على رسائل التسويق', 'Accepts marketing')}
              />
            </fieldset>
          </Pane>

          <Pane title={tx('ملف البشرة', 'Skin profile')}>
            <fieldset disabled={readOnly} className="stack adm-readonly" style={{ gap: 12 }}>
              <label className="field">
                <span className="field__label">{tx('نوع البشرة', 'Skin type')}</span>
                <select className="select" value={c.skinType} onChange={(e) => save({ skinType: e.target.value as SkinType }, tx('تم تحديث ملف البشرة', 'Skin profile updated'))}>
                  {(Object.keys(SKIN_LABEL) as SkinType[]).map((k) => (
                    <option key={k} value={k}>
                      {pick(SKIN_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <span className="field__label">{tx('الاهتمامات', 'Concerns')}</span>
                <div className="gr-chips">
                  {(Object.keys(CONCERN_LABEL) as Concern[]).map((k) => (
                    <button key={k} type="button" className="gr-chip" aria-pressed={c.concerns.includes(k)} onClick={() => toggleConcern(k)}>
                      {pick(CONCERN_LABEL[k])}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>
          </Pane>

          <Pane title={tx('الوسوم والملاحظات', 'Tags and notes')}>
            <fieldset disabled={readOnly} className="stack adm-readonly" style={{ gap: 12 }}>
              <div className="gr-chips">
                {c.tags.length === 0 && <span className="small faint">{tx('بدون وسوم', 'No tags')}</span>}
                {c.tags.map((t) => (
                  <span key={t} className="gr-chip">
                    <Link to={`/admin/customers?tag=${encodeURIComponent(t)}`} style={{ color: 'inherit' }}>
                      {t}
                    </Link>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm btn--icon"
                      style={{ width: 18, height: 18 }}
                      onClick={() => save({ tags: c.tags.filter((x) => x !== t) }, tx('تم حذف الوسم', 'Tag removed'))}
                      aria-label={tx(`حذف الوسم ${t}`, `Remove tag ${t}`)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault()
                  addTag()
                }}
              >
                <input className="input" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder={tx('وسم جديد', 'New tag')} aria-label={tx('وسم جديد', 'New tag')} />
                <button className="btn" type="submit" disabled={!tagDraft.trim()}>
                  {tx('إضافة', 'Add')}
                </button>
              </form>
              <label className="field">
                <span className="field__label">{tx('ملاحظة داخلية', 'Internal note')}</span>
                <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx('مثلًا: بتفضّل التوصيل بعد 5 مساءً', 'e.g. prefers delivery after 5 pm')} />
              </label>
              <div>
                <button className="btn btn--primary" disabled={note === (c.note ?? '')} onClick={() => save({ note: note.trim() || undefined }, tx('تم حفظ الملاحظة', 'Note saved'))}>
                  {tx('حفظ الملاحظة', 'Save note')}
                </button>
              </div>
            </fieldset>
          </Pane>
        </div>
      </div>
    </>
  )
}
