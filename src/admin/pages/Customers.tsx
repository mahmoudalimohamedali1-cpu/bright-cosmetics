import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Download, MessageCircle, Search, Tag, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { GOVERNORATES } from '../../data/seed'
import { SKIN_LABEL } from '../../data/catalog'
import { SEGMENT_LABEL } from '../../lib/metrics'
import type { CustomerStats, Segment } from '../../lib/metrics'
import type { SkinType } from '../../data/types'
import { Avatar, DemoNote, Empty, PageHeader, useAdmin } from '../ui'
import { Composer, LedgerCell, SegmentBadge, useCustomerStats } from '../parts/growth'
import { downloadCSV, SEGMENT_ORDER, today } from '../parts/growth/util'

type SortKey = 'spent' | 'orders' | 'aov' | 'last' | 'newest' | 'name'
const PAGE = 50

export default function Customers() {
  const { tx, pick, money, num, pct, relTime } = useI18n()
  const { toast, staff, can } = useAdmin()
  const stats = useCustomerStats()
  const upsertCustomer = useStore((s) => s.upsertCustomer)
  const log = useStore((s) => s.log)
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const segment = (params.get('segment') ?? '') as Segment | ''
  const gov = params.get('gov') ?? ''
  const skin = (params.get('skin') ?? '') as SkinType | ''
  const mkt = params.get('mkt') ?? ''
  const tag = params.get('tag') ?? ''
  const rScore = Number(params.get('r') ?? 0)
  const fScore = Number(params.get('f') ?? 0)
  const sort = (params.get('sort') ?? 'spent') as SortKey

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(PAGE)
  const [tagDraft, setTagDraft] = useState('')
  const [tagOpen, setTagOpen] = useState(false)
  const [composer, setComposer] = useState(0)

  const allTags = useMemo(() => [...new Set(stats.flatMap((s) => s.customer.tags))].sort(), [stats])

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    const out = stats.filter(({ customer: c, segment: sg, r, f }) => {
      if (needle) {
        const hit =
          c.name.ar.toLowerCase().includes(needle) ||
          c.name.en.toLowerCase().includes(needle) ||
          c.email.toLowerCase().includes(needle) ||
          (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits))
        if (!hit) return false
      }
      if (segment && sg !== segment) return false
      if (gov && c.governorateId !== gov) return false
      if (skin && c.skinType !== skin) return false
      if (mkt === 'yes' && !c.acceptsMarketing) return false
      if (mkt === 'no' && c.acceptsMarketing) return false
      if (tag && !c.tags.includes(tag)) return false
      if (rScore && r !== rScore) return false
      if (fScore && f !== fScore) return false
      return true
    })
    const by: Record<SortKey, (a: CustomerStats, b: CustomerStats) => number> = {
      spent: (a, b) => b.spent - a.spent,
      orders: (a, b) => b.orders - a.orders || b.spent - a.spent,
      aov: (a, b) => b.aov - a.aov,
      last: (a, b) => (b.lastOrder ?? '').localeCompare(a.lastOrder ?? ''),
      newest: (a, b) => b.customer.createdAt.localeCompare(a.customer.createdAt),
      name: (a, b) => pick(a.customer.name).localeCompare(pick(b.customer.name)),
    }
    return out.sort(by[sort])
  }, [stats, q, segment, gov, skin, mkt, tag, rScore, fScore, sort, pick])

  const filtered = !!(q || segment || gov || skin || mkt || tag || rScore || fScore)
  const totals = useMemo(() => {
    const spent = rows.reduce((s, r) => s + r.spent, 0)
    const orders = rows.reduce((s, r) => s + r.orders, 0)
    const buyers = rows.filter((r) => r.orders > 0).length
    return {
      spent,
      aov: orders ? spent / orders : 0,
      repeat: buyers ? rows.filter((r) => r.orders > 1).length / buyers : 0,
      marketing: rows.length ? rows.filter((r) => r.customer.acceptsMarketing).length / rows.length : 0,
    }
  }, [rows])

  const visible = rows.slice(0, limit)
  const selRows = rows.filter((r) => selected.has(r.customer.id))
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.customer.id))

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const govName = (id: string) => pick(GOVERNORATES.find((g) => g.id === id)?.name)

  const exportRows = (list: CustomerStats[]) =>
    downloadCSV(
      `nuri-customers-${today()}.csv`,
      ['id', 'name_ar', 'name_en', 'phone', 'email', 'governorate', 'skin_type', 'orders', 'total_spent_egp', 'aov_egp', 'last_order', 'segment', 'accepts_marketing', 'tags'],
      list.map((r) => [
        r.customer.id,
        r.customer.name.ar,
        r.customer.name.en,
        r.customer.phone,
        r.customer.email,
        GOVERNORATES.find((g) => g.id === r.customer.governorateId)?.name.en,
        r.customer.skinType,
        r.orders,
        Math.round(r.spent),
        Math.round(r.aov),
        r.lastOrder?.slice(0, 10) ?? '',
        SEGMENT_LABEL[r.segment].en,
        r.customer.acceptsMarketing ? 'yes' : 'no',
        r.customer.tags.join(' '),
      ]),
    )

  const applyTag = () => {
    const t = tagDraft.trim().toLowerCase().replace(/\s+/g, '-')
    if (!t) return
    selRows.forEach((r) => {
      if (!r.customer.tags.includes(t)) upsertCustomer({ ...r.customer, tags: [...r.customer.tags, t] })
    })
    log(staff, { ar: `أضاف الوسم «${t}» لـ ${selRows.length} عميل`, en: `Tagged ${selRows.length} customers “${t}”` }, '/admin/customers')
    toast(tx(`تمت إضافة الوسم لـ ${num(selRows.length)} عميل`, `Tag added to ${num(selRows.length)} customers`))
    setTagDraft('')
    setTagOpen(false)
  }

  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: true })
    setLimit(PAGE)
  }

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'spent', label: tx('الأعلى صرفًا', 'Highest spend') },
    { value: 'orders', label: tx('الأكثر طلبات', 'Most orders') },
    { value: 'aov', label: tx('أعلى متوسط طلب', 'Highest AOV') },
    { value: 'last', label: tx('آخر طلب', 'Last order') },
    { value: 'newest', label: tx('الأحدث تسجيلًا', 'Newest') },
    { value: 'name', label: tx('الاسم', 'Name') },
  ]

  return (
    <>
      <PageHeader
        title={tx('العملاء', 'Customers')}
        description={
          <>
            {tx('كل عميل مع نوع بشرته وشريحته وقيمته. ', 'Every customer with skin type, segment and value. ')}
            <DemoNote />
          </>
        }
        actions={
          <>
            <Link className="btn" to="/admin/segments">
              {tx('الشرائح', 'Segments')}
            </Link>
            <button className="btn" onClick={() => exportRows(rows)} disabled={!rows.length}>
              <Download size={16} aria-hidden />
              {filtered ? tx(`تصدير ${num(rows.length)}`, `Export ${num(rows.length)}`) : tx('تصدير الكل', 'Export all')}
            </button>
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={filtered ? tx('عملاء مطابقين', 'Matching customers') : tx('العملاء', 'Customers')} value={num(rows.length)} meta={filtered ? tx(`من ${num(stats.length)}`, `of ${num(stats.length)}`) : undefined} />
        <LedgerCell label={tx('إجمالي الصرف', 'Total spent')} value={money(totals.spent, { compact: totals.spent > 1e6 })} meta={tx('صافي بعد الخصم، بدون الشحن', 'Net of discounts, excl. shipping')} />
        <LedgerCell label={tx('متوسط الطلب', 'Average order')} value={money(totals.aov)} />
        <LedgerCell
          label={tx('اشتروا أكتر من مرة', 'Bought more than once')}
          value={pct(totals.repeat)}
          meta={
            <>
              {tx('موافقين على التسويق:', 'Accept marketing:')} {pct(totals.marketing, 0)}
            </>
          }
          to={`/admin/customers?${new URLSearchParams({ ...Object.fromEntries(params), mkt: 'yes' })}`}
        />
      </div>

      {selected.size > 0 && (
        <div className="bulkbar" role="region" aria-label={tx('إجراءات جماعية', 'Bulk actions')}>
          <strong className="num">{tx(`${num(selected.size)} محدد`, `${num(selected.size)} selected`)}</strong>
          <button className="btn btn--sm" onClick={() => exportRows(selRows)}>
            <Download size={14} aria-hidden />
            {tx('تصدير CSV', 'Export CSV')}
          </button>
          {!can('customers.edit') ? null : tagOpen ? (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                applyTag()
              }}
            >
              <input
                className="input"
                style={{ height: 30, width: 160 }}
                autoFocus
                list="gr-tags"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder={tx('اسم الوسم', 'Tag name')}
                aria-label={tx('اسم الوسم', 'Tag name')}
              />
              <datalist id="gr-tags">
                {allTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <button className="btn btn--sm" type="submit" disabled={!tagDraft.trim()}>
                {tx('إضافة', 'Add')}
              </button>
            </form>
          ) : (
            <button className="btn btn--sm" onClick={() => setTagOpen(true)}>
              <Tag size={14} aria-hidden />
              {tx('إضافة وسم', 'Add tag')}
            </button>
          )}
          {(can('customers.edit') || can('marketing.edit')) && <button className="btn btn--sm" onClick={() => setComposer((n) => n + 1)}>
            <MessageCircle size={14} aria-hidden />
            {tx('رسالة واتساب', 'WhatsApp message')}
          </button>}
          <button className="btn btn--sm btn--icon" style={{ marginInlineStart: 'auto' }} onClick={() => setSelected(new Set())} aria-label={tx('إلغاء التحديد', 'Clear selection')}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="pane pane--flush">
        <div className="toolbar">
          <div className="input-group" style={{ flex: '1 1 240px', maxWidth: 340 }}>
            <span className="addon">
              <Search size={14} aria-hidden />
            </span>
            <input
              className="input"
              style={{ maxWidth: 'none', height: 34 }}
              type="search"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder={tx('بحث بالاسم أو التليفون أو البريد', 'Search name, phone or email')}
              aria-label={tx('بحث في العملاء', 'Search customers')}
            />
          </div>
          <div className="gr-filters">
            <select className="select" value={segment} onChange={(e) => setParam('segment', e.target.value)} aria-label={tx('الشريحة', 'Segment')}>
              <option value="">{tx('كل الشرائح', 'All segments')}</option>
              {SEGMENT_ORDER.map((s) => (
                <option key={s} value={s}>
                  {pick(SEGMENT_LABEL[s])}
                </option>
              ))}
            </select>
            <select className="select" value={gov} onChange={(e) => setParam('gov', e.target.value)} aria-label={tx('المحافظة', 'Governorate')}>
              <option value="">{tx('كل المحافظات', 'All governorates')}</option>
              {GOVERNORATES.map((g) => (
                <option key={g.id} value={g.id}>
                  {pick(g.name)}
                </option>
              ))}
            </select>
            <select className="select" value={skin} onChange={(e) => setParam('skin', e.target.value)} aria-label={tx('نوع البشرة', 'Skin type')}>
              <option value="">{tx('كل أنواع البشرة', 'All skin types')}</option>
              {(Object.keys(SKIN_LABEL) as SkinType[]).map((k) => (
                <option key={k} value={k}>
                  {pick(SKIN_LABEL[k])}
                </option>
              ))}
            </select>
            <select className="select" value={mkt} onChange={(e) => setParam('mkt', e.target.value)} aria-label={tx('التسويق', 'Marketing')}>
              <option value="">{tx('التسويق: الكل', 'Marketing: all')}</option>
              <option value="yes">{tx('موافق على التسويق', 'Accepts marketing')}</option>
              <option value="no">{tx('غير موافق', 'Doesn’t accept')}</option>
            </select>
            <select className="select" value={tag} onChange={(e) => setParam('tag', e.target.value)} aria-label={tx('الوسم', 'Tag')}>
              <option value="">{tx('كل الوسوم', 'All tags')}</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="row small muted" style={{ gap: 6 }}>
              <ArrowDownUp size={14} aria-hidden />
              <span className="sr-only">{tx('ترتيب', 'Sort')}</span>
              <select className="select" value={sort} onChange={(e) => setParam('sort', e.target.value === 'spent' ? '' : e.target.value)} aria-label={tx('ترتيب', 'Sort')}>
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {(rScore > 0 || fScore > 0) && (
              <button className="gr-chip" aria-pressed="true" onClick={() => setParams(new URLSearchParams([...params].filter(([k]) => k !== 'r' && k !== 'f')), { replace: true })}>
                {tx(`حداثة ${rScore || "—"}، تكرار ${fScore || '—'}`, `Recency ${rScore || '—'}, frequency ${fScore || '—'}`)}
                <X size={12} aria-hidden />
              </button>
            )}
            {filtered && (
              <button className="btn btn--ghost btn--sm" onClick={clearAll}>
                {tx('مسح الفلاتر', 'Clear filters')}
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty
            title={tx('مفيش عملاء مطابقين', 'No customers match')}
            action={
              <button className="btn" onClick={clearAll}>
                {tx('مسح الفلاتر', 'Clear filters')}
              </button>
            }
          >
            {tx('جرّب جزء من الاسم أو آخر 4 أرقام من التليفون، أو شيل فلتر.', 'Try part of a name, the last 4 digits of a phone, or remove a filter.')}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      className="check"
                      checked={allVisibleSelected}
                      onChange={() =>
                        setSelected((s) => {
                          const n = new Set(s)
                          visible.forEach((r) => (allVisibleSelected ? n.delete(r.customer.id) : n.add(r.customer.id)))
                          return n
                        })
                      }
                      aria-label={tx('تحديد الكل', 'Select all')}
                    />
                  </th>
                  <th>{tx('العميل', 'Customer')}</th>
                  <th>{tx('التليفون', 'Phone')}</th>
                  <th className="gr-hide-md">{tx('المحافظة', 'Governorate')}</th>
                  <th className="gr-hide-md">{tx('البشرة', 'Skin')}</th>
                  <th className="t-num">{tx('الطلبات', 'Orders')}</th>
                  <th className="t-num">{tx('إجمالي الصرف', 'Spent')}</th>
                  <th className="t-num gr-hide-md">{tx('متوسط الطلب', 'AOV')}</th>
                  <th>{tx('آخر طلب', 'Last order')}</th>
                  <th>{tx('الشريحة', 'Segment')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const c = r.customer
                  return (
                    <tr key={c.id} data-selected={selected.has(c.id)}>
                      <td>
                        <input type="checkbox" className="check" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={tx(`تحديد ${pick(c.name)}`, `Select ${pick(c.name)}`)} />
                      </td>
                      <td>
                        <Link to={`/admin/customers/${c.id}`} className="row" style={{ color: 'inherit', gap: 10 }}>
                          <Avatar name={pick(c.name)} />
                          <span style={{ minWidth: 0 }}>
                            <span className="strong">{pick(c.name)}</span>
                            {c.tags.length > 0 && <span className="tiny faint" style={{ display: 'block' }}>{c.tags.join('، ')}</span>}
                          </span>
                        </Link>
                      </td>
                      <td className="num gr-ltr small">{c.phone}</td>
                      <td className="gr-hide-md">{govName(c.governorateId)}</td>
                      <td className="gr-hide-md">{pick(SKIN_LABEL[c.skinType])}</td>
                      <td className="t-num">
                        {r.orders > 0 ? <Link to={`/admin/customers/${c.id}#orders`}>{num(r.orders)}</Link> : <span className="faint">0</span>}
                      </td>
                      <td className="t-num">{money(r.spent)}</td>
                      <td className="t-num gr-hide-md">{r.orders ? money(r.aov) : '—'}</td>
                      <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                        {r.lastOrder ? relTime(r.lastOrder) : tx('لم يطلب بعد', 'No orders yet')}
                      </td>
                      <td>
                        <SegmentBadge s={r.segment} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {rows.length > 0 && (
          <div className="pane__foot">
            <span className="num">{tx(`عرض ${num(visible.length)} من ${num(rows.length)}`, `Showing ${num(visible.length)} of ${num(rows.length)}`)}</span>
            {visible.length < rows.length && (
              <button className="btn btn--sm" onClick={() => setLimit((l) => l + PAGE)}>
                {tx('عرض المزيد', 'Show more')}
              </button>
            )}
          </div>
        )}
      </section>

      {composer > 0 && (
        <Composer
          key={composer}
          open
          onClose={() => setComposer(0)}
          recipients={selRows.map((r) => r.customer)}
          title={tx(`رسالة واتساب لـ ${num(selRows.length)} عميل`, `WhatsApp message to ${num(selRows.length)} customers`)}
          context={{ ar: 'عملاء محددين', en: 'selected customers' }}
          defaults={{
            ar: 'أهلًا {name}، معاكي برايت. وصلنا مخزون جديد من منتجاتك المفضلة من كوريا، ومستنيينك.',
            en: 'Hi {name}, it’s Bright. New stock of your favourite Korean picks just landed.',
          }}
        />
      )}
    </>
  )
}
