import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { CATEGORY_LABEL } from '../../data/catalog'
import { isCounted, netRevenue } from '../../lib/metrics'
import { uid } from '../../lib/rand'
import type { Category, Discount, DiscountKind } from '../../data/types'
import { Badge, DemoNote, Drawer, Empty, Field, PageHeader, Switch, Tabs, useAdmin } from '../ui'
import { LedgerCell, Takeaway } from '../parts/growth'
import { downloadCSV, genCode, today } from '../parts/growth/util'

type Tab = 'active' | 'scheduled' | 'expired' | 'all'

const KIND_LABEL: Record<DiscountKind, { ar: string; en: string }> = {
  percent: { ar: 'نسبة مئوية', en: 'Percentage' },
  fixed: { ar: 'مبلغ ثابت', en: 'Fixed amount' },
  free_shipping: { ar: 'شحن مجاني', en: 'Free shipping' },
  bogo: { ar: 'القطعة التانية بخصم', en: 'Buy one, get one' },
  bundle: { ar: 'باقة روتين', en: 'Routine bundle' },
}

function phase(d: Discount, now = Date.now()): Exclude<Tab, 'all'> {
  if (new Date(d.startsAt).getTime() > now) return 'scheduled'
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return 'expired'
  return 'active'
}

const blank = (): Discount => ({
  id: '',
  code: genCode('BRIGHT'),
  title: { ar: '', en: '' },
  kind: 'percent',
  value: 10,
  minSubtotal: 0,
  usageLimit: undefined,
  used: 0,
  startsAt: new Date().toISOString(),
  endsAt: undefined,
  active: true,
  automatic: false,
  appliesTo: 'all',
  target: [],
})

export default function Discounts() {
  const { tx, pick, money, num, pct, date } = useI18n()
  const { toast, staff } = useAdmin()
  const discounts = useStore((s) => s.discounts)
  const orders = useStore((s) => s.orders)
  const upsertDiscount = useStore((s) => s.upsertDiscount)
  const deleteDiscount = useStore((s) => s.deleteDiscount)
  const log = useStore((s) => s.log)
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('active')
  const [editing, setEditing] = useState<Discount | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing(blank())
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  /* Attribution from orders that carried the code */
  const attrib = useMemo(() => {
    const m = new Map<string, { orders: number; revenue: number; given: number }>()
    for (const o of orders) {
      if (!o.discountCode || !isCounted(o) || o.fulfillment === 'returned') continue
      const k = o.discountCode.toUpperCase()
      const e = m.get(k) ?? { orders: 0, revenue: 0, given: 0 }
      e.orders++
      e.revenue += netRevenue(o)
      e.given += o.discount
      m.set(k, e)
    }
    return m
  }, [orders])

  const counts = useMemo(() => {
    const c = { active: 0, scheduled: 0, expired: 0, all: discounts.length }
    discounts.forEach((d) => c[phase(d)]++)
    return c
  }, [discounts])

  const rows = discounts.filter((d) => tab === 'all' || phase(d) === tab)

  const totals = useMemo(() => {
    let revenue = 0
    let given = 0
    let n = 0
    attrib.forEach((v) => {
      revenue += v.revenue
      given += v.given
      n += v.orders
    })
    const counted = orders.filter((o) => isCounted(o) && o.fulfillment !== 'returned')
    return { revenue, given, n, share: counted.length ? n / counted.length : 0 }
  }, [attrib, orders])

  const best = [...attrib.entries()].filter(([, v]) => v.given > 0).sort((a, b) => b[1].revenue / b[1].given - a[1].revenue / a[1].given)[0]

  const toggleActive = (d: Discount, v: boolean) => {
    upsertDiscount({ ...d, active: v })
    log(staff, { ar: `${v ? 'فعّل' : 'أوقف'} الخصم ${d.code}`, en: `${v ? 'Activated' : 'Paused'} discount ${d.code}` }, '/admin/discounts')
    toast(v ? tx(`تم تفعيل ${d.code}`, `${d.code} activated`) : tx(`تم إيقاف ${d.code}`, `${d.code} paused`))
  }

  const remove = (d: Discount) => {
    deleteDiscount(d.id)
    log(staff, { ar: `حذف الخصم ${d.code}`, en: `Deleted discount ${d.code}` }, '/admin/discounts')
    toast(tx(`تم حذف ${d.code}`, `${d.code} deleted`))
    setConfirmId(null)
    setEditing(null)
  }

  const valueText = (d: Discount) =>
    d.kind === 'percent' || d.kind === 'bundle'
      ? pct(d.value / 100, 0)
      : d.kind === 'fixed'
        ? money(d.value)
        : d.kind === 'bogo'
          ? tx(`${pct(d.value / 100, 0)} للتانية`, `${pct(d.value / 100, 0)} off 2nd`)
          : '—'

  const exportCSV = () =>
    downloadCSV(
      `nuri-discounts-${today()}.csv`,
      ['code', 'title_en', 'title_ar', 'kind', 'value', 'min_subtotal', 'used', 'usage_limit', 'starts', 'ends', 'automatic', 'active', 'attributed_orders', 'attributed_revenue_egp', 'discount_given_egp'],
      discounts.map((d) => {
        const a = attrib.get(d.code.toUpperCase())
        return [d.code, d.title.en, d.title.ar, d.kind, d.value, d.minSubtotal, d.used, d.usageLimit ?? '', d.startsAt.slice(0, 10), d.endsAt?.slice(0, 10) ?? '', d.automatic ? 'yes' : 'no', d.active ? 'yes' : 'no', a?.orders ?? 0, Math.round(a?.revenue ?? 0), Math.round(a?.given ?? 0)]
      }),
    )

  return (
    <>
      <PageHeader
        title={tx('الخصومات', 'Discounts')}
        description={
          <>
            {tx('أكواد وعروض تلقائية، مع الإيراد اللي جابه كل كود مقابل الخصم اللي اتدفع فيه. ', 'Codes and automatic offers, with the revenue each code brought in against what it gave away. ')}
            <DemoNote />
          </>
        }
        actions={
          <>
            <button className="btn" onClick={exportCSV}>
              <Download size={16} aria-hidden />
              {tx('تصدير', 'Export')}
            </button>
            <button className="btn btn--live" onClick={() => setEditing(blank())}>
              <Plus size={16} aria-hidden />
              {tx('إنشاء خصم', 'Create discount')}
            </button>
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={tx('خصومات شغّالة', 'Live discounts')} value={num(discounts.filter((d) => d.active && phase(d) === 'active').length)} meta={tx(`${num(counts.scheduled)} مجدول`, `${num(counts.scheduled)} scheduled`)} />
        <LedgerCell label={tx('طلبات بكود', 'Orders with a code')} value={num(totals.n)} meta={tx(`${pct(totals.share)} من كل الطلبات`, `${pct(totals.share)} of all orders`)} to="/admin/orders" />
        <LedgerCell label={tx('إيراد من الأكواد', 'Revenue from codes')} value={money(totals.revenue, { compact: true })} meta={tx('صافي بعد الخصم، بدون الشحن', 'Net of discount, excl. shipping')} />
        <LedgerCell
          label={tx('العائد لكل جنيه خصم', 'Return per EGP discounted')}
          value={totals.given ? <bdi dir="ltr">{`${num(totals.revenue / totals.given, { maximumFractionDigits: 1 })}×`}</bdi> : '—'}
          meta={tx(`خصم مدفوع ${money(totals.given)}`, `${money(totals.given)} given away`)}
        />
      </div>

      <section className="pane pane--flush">
        <div style={{ padding: '0 12px' }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'active', label: tx('سارية', 'Active'), count: counts.active },
              { value: 'scheduled', label: tx('مجدولة', 'Scheduled'), count: counts.scheduled },
              { value: 'expired', label: tx('منتهية', 'Expired'), count: counts.expired },
              { value: 'all', label: tx('الكل', 'All'), count: counts.all },
            ]}
          />
        </div>
        {best && (
          <div style={{ padding: '12px 16px 0' }}>
            <Takeaway>
              {tx('أعلى عائد: ', 'Best return: ')}
              <strong className="gr-code">{best[0]}</strong>
              {tx(
                ` جاب ${money(best[1].revenue)} مقابل ${money(best[1].given)} خصم، يعني ${num(best[1].revenue / best[1].given, { maximumFractionDigits: 1 })} جنيه لكل جنيه. العروض التلقائية مش بتتسجّل على الطلب لسه، فعائدها غير متاح.`,
                ` brought ${money(best[1].revenue)} for ${money(best[1].given)} off, ${num(best[1].revenue / best[1].given, { maximumFractionDigits: 1 })}× per pound. Automatic offers aren’t recorded on orders yet, so their return isn’t available.`,
              )}
            </Takeaway>
          </div>
        )}
        {rows.length === 0 ? (
          <Empty
            title={tab === 'scheduled' ? tx('مفيش خصومات مجدولة', 'No scheduled discounts') : tab === 'expired' ? tx('مفيش خصومات منتهية', 'No expired discounts') : tx('مفيش خصومات', 'No discounts')}
            action={
              <button className="btn" onClick={() => setEditing(blank())}>
                {tx('إنشاء خصم', 'Create discount')}
              </button>
            }
          >
            {tx('الخصم اللي تاريخ بدايته في المستقبل بيظهر هنا.', 'A discount with a future start date shows here.')}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table gr-table-tight">
              <thead>
                <tr>
                  <th>{tx('الكود', 'Code')}</th>
                  <th>{tx('النوع', 'Type')}</th>
                  <th className="t-num">{tx('القيمة', 'Value')}</th>
                  <th style={{ minWidth: 130 }}>{tx('الاستخدام', 'Usage')}</th>
                  <th className="gr-hide-md">{tx('المدة', 'Dates')}</th>
                  <th className="t-num">{tx('إيراد منسوب', 'Revenue')}</th>
                  <th className="t-num">{tx('العائد', 'Return')}</th>
                  <th>{tx('مفعّل', 'On')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const a = attrib.get(d.code.toUpperCase())
                  const ph = phase(d)
                  return (
                    <tr key={d.id}>
                      <td>
                        <button className="btn btn--ghost btn--sm" style={{ height: 'auto', padding: 0, display: 'block', textAlign: 'start' }} onClick={() => setEditing(d)}>
                          <span className="gr-code">{d.code}</span>
                          <span className="tiny faint" style={{ display: 'block', fontWeight: 400 }}>
                            {pick(d.title)}
                          </span>
                        </button>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div className="small">{pick(KIND_LABEL[d.kind])}</div>
                        <Badge tone="hollow" plain>
                          {d.automatic ? tx('تلقائي', 'Automatic') : tx('بكود', 'Code')}
                        </Badge>
                      </td>
                      <td className="t-num">{valueText(d)}</td>
                      <td>
                        <div className="num small">
                          <bdi dir="ltr">
                            {num(d.used)}
                            {d.usageLimit ? ` / ${num(d.usageLimit)}` : ''}
                          </bdi>
                        </div>
                        {d.usageLimit ? (
                          <div className="meter" style={{ marginTop: 4 }} aria-hidden>
                            <span style={{ width: `${Math.min(100, (d.used / d.usageLimit) * 100)}%` }} />
                          </div>
                        ) : (
                          <div className="tiny faint">{tx('بدون حد', 'No limit')}</div>
                        )}
                      </td>
                      <td className="small muted gr-hide-md" style={{ whiteSpace: 'nowrap' }}>
                        <div>{tx('من ', 'From ')}{date(d.startsAt, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div>{d.endsAt ? <>{tx('لحد ', 'To ')}{date(d.endsAt, { day: 'numeric', month: 'short', year: 'numeric' })}</> : tx('بدون نهاية', 'No end date')}</div>
                        <div>
                          {ph === 'scheduled' && <Badge tone="info">{tx('مجدول', 'Scheduled')}</Badge>}
                          {ph === 'expired' && <Badge>{tx('انتهى', 'Expired')}</Badge>}
                        </div>
                      </td>
                      <td className="t-num">
                        {d.automatic ? (
                          <span className="tiny faint">{tx('غير متتبَّع', 'Not tracked')}</span>
                        ) : a ? (
                          <>
                            <Link to={`/admin/orders?code=${encodeURIComponent(d.code)}`}>{money(a.revenue)}</Link>
                            <div className="tiny faint">{tx(`${num(a.orders)} طلب`, `${num(a.orders)} orders`)}</div>
                          </>
                        ) : (
                          <span className="faint">{money(0)}</span>
                        )}
                      </td>
                      <td className="t-num">
                        {a && a.given > 0 ? (
                          <>
                            <bdi dir="ltr" className="strong">{num(a.revenue / a.given, { maximumFractionDigits: 1 })}×</bdi>
                            <div className="tiny faint">{tx(`خصم ${money(a.given)}`, `${money(a.given)} off`)}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <Switch checked={d.active} onChange={(v) => toggleActive(d, v)} label={tx(`تفعيل ${d.code}`, `Activate ${d.code}`)} />
                      </td>
                      <td>
                        {confirmId === d.id ? (
                          <div className="row" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn--sm btn--danger" onClick={() => remove(d)}>
                              {tx('تأكيد الحذف', 'Confirm delete')}
                            </button>
                            <button className="btn btn--sm btn--ghost" onClick={() => setConfirmId(null)}>
                              {tx('إلغاء', 'Cancel')}
                            </button>
                          </div>
                        ) : (
                          <div className="row" style={{ justifyContent: 'flex-end', gap: 2 }}>
                            <button className="btn btn--ghost btn--sm btn--icon" onClick={() => setEditing(d)} aria-label={tx(`تعديل ${d.code}`, `Edit ${d.code}`)}>
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn--ghost btn--sm btn--icon btn--danger" onClick={() => setConfirmId(d.id)} aria-label={tx(`حذف ${d.code}`, `Delete ${d.code}`)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <DiscountEditor
          key={editing.id || 'new'}
          initial={editing}
          onClose={() => setEditing(null)}
          onDelete={editing.id ? () => remove(editing) : undefined}
          onSave={(d) => {
            const isNew = !d.id
            const saved = { ...d, id: d.id || uid('d') }
            upsertDiscount(saved)
            log(staff, { ar: `${isNew ? 'أنشأ' : 'عدّل'} الخصم ${saved.code}`, en: `${isNew ? 'Created' : 'Updated'} discount ${saved.code}` }, '/admin/discounts')
            toast(isNew ? tx(`تم إنشاء ${saved.code}`, `${saved.code} created`) : tx(`تم حفظ ${saved.code}`, `${saved.code} saved`))
            setTab(phase(saved))
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

/* ───────── Create / edit drawer ───────── */

function DiscountEditor({ initial, onClose, onSave, onDelete }: { initial: Discount; onClose: () => void; onSave: (d: Discount) => void; onDelete?: () => void }) {
  const { tx, pick, money, pct, date, lang } = useI18n()
  const discounts = useStore((s) => s.discounts)
  const products = useStore((s) => s.products)
  const [d, setD] = useState<Discount>(initial)
  const [touched, setTouched] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [pq, setPq] = useState('')
  const set = <K extends keyof Discount>(k: K, v: Discount[K]) => setD((x) => ({ ...x, [k]: v }))

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products])
  const categories = Object.keys(CATEGORY_LABEL) as Category[]

  const dayVal = (iso?: string) => {
    if (!iso) return ''
    const t = new Date(iso)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }
  const fromDay = (v: string, end = false) => (v ? new Date(`${v}T${end ? '23:59:59' : '00:00:00'}`).toISOString() : undefined)

  /* Validation */
  const errors: Partial<Record<'code' | 'title' | 'value' | 'dates' | 'target' | 'limit' | 'min', string>> = {}
  const code = d.code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) errors.code = tx('من 3 إلى 20 حرف إنجليزي أو رقم أو - بدون مسافات', '3–20 letters, digits or dashes, no spaces')
  else if (discounts.some((x) => x.id !== d.id && x.code.toUpperCase() === code)) errors.code = tx('الكود ده مستخدم في خصم تاني', 'Another discount already uses this code')
  if (!d.title.ar.trim() || !d.title.en.trim()) errors.title = tx('العنوان مطلوب باللغتين، لأنه بيظهر للعميل', 'A title is needed in both languages; customers see it')
  if (d.kind === 'percent' || d.kind === 'bundle' || d.kind === 'bogo') {
    if (!(d.value >= 1 && d.value <= 100)) errors.value = tx('النسبة بين 1 و100', 'Between 1 and 100')
  } else if (d.kind === 'fixed' && !(d.value > 0)) errors.value = tx('المبلغ لازم يكون أكبر من صفر', 'Must be more than zero')
  if (d.kind === 'fixed' && d.minSubtotal > 0 && d.value >= d.minSubtotal) errors.value = tx('الخصم أكبر من الحد الأدنى للطلب', 'Discount is larger than the minimum order')
  if (d.minSubtotal < 0) errors.min = tx('مينفعش يكون بالسالب', 'Can’t be negative')
  if (d.usageLimit !== undefined && !(d.usageLimit >= 1)) errors.limit = tx('الحد لازم يكون 1 أو أكتر', 'Must be 1 or more')
  if (d.usageLimit !== undefined && d.usageLimit < d.used) errors.limit = tx(`اتستخدم ${d.used} مرة بالفعل`, `Already used ${d.used} times`)
  if (d.endsAt && new Date(d.endsAt) <= new Date(d.startsAt)) errors.dates = tx('تاريخ النهاية لازم يكون بعد البداية', 'End date must be after the start')
  if (d.appliesTo !== 'all' && !(d.target ?? []).length) errors.target = tx('اختيار عنصر واحد على الأقل', 'Choose at least one')
  const valid = Object.keys(errors).length === 0
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined)

  /* Plain-language summary */
  const targetText = (() => {
    const t = d.target ?? []
    if (d.appliesTo === 'all' || !t.length) return tx('كل المنتجات', 'all products')
    if (d.appliesTo === 'category') return t.map((c) => pick(CATEGORY_LABEL[c as Category])).join(lang === 'ar' ? '، ' : ', ')
    if (d.appliesTo === 'brand') return t.join(lang === 'ar' ? '، ' : ', ')
    return tx(`${t.length} منتج محدد`, `${t.length} selected products`)
  })()
  const what =
    d.kind === 'percent'
      ? tx(`خصم ${pct(d.value / 100, 0)} على ${targetText}`, `${pct(d.value / 100, 0)} off ${targetText}`)
      : d.kind === 'fixed'
        ? tx(`خصم ${money(d.value)} على ${targetText}`, `${money(d.value)} off ${targetText}`)
        : d.kind === 'free_shipping'
          ? tx('شحن مجاني لكل المحافظات', 'Free shipping to every governorate')
          : d.kind === 'bogo'
            ? tx(`عند شراء قطعة من ${targetText}، التانية بخصم ${pct(d.value / 100, 0)}`, `Buy one from ${targetText}, get the second at ${pct(d.value / 100, 0)} off`)
            : tx(`خصم ${pct(d.value / 100, 0)} لما العميل يشتري 3 خطوات روتين أو أكتر من ${targetText}`, `${pct(d.value / 100, 0)} off when a customer buys 3 or more routine steps from ${targetText}`)
  const how = d.automatic ? tx('بيتطبّق تلقائيًا في السلة', 'Applied automatically at checkout') : tx(`بالكود ${code || '…'}`, `with code ${code || '…'}`)
  const minText = d.minSubtotal > 0 ? tx(`للطلبات من ${money(d.minSubtotal)}`, `on orders from ${money(d.minSubtotal)}`) : tx('بدون حد أدنى', 'no minimum')
  const limitText = d.usageLimit ? tx(`لأول ${d.usageLimit} استخدام`, `for the first ${d.usageLimit} uses`) : tx('بدون حد استخدام', 'unlimited uses')
  const when = d.endsAt
    ? tx(`من ${date(d.startsAt)} لحد ${date(d.endsAt)}`, `from ${date(d.startsAt)} to ${date(d.endsAt)}`)
    : tx(`من ${date(d.startsAt)} بدون نهاية`, `from ${date(d.startsAt)}, no end date`)

  const toggleTarget = (v: string) => set('target', (d.target ?? []).includes(v) ? (d.target ?? []).filter((x) => x !== v) : [...(d.target ?? []), v])
  const shownProducts = products.filter((p) => p.status !== 'archived' && (!pq || `${p.name.en} ${p.name.ar} ${p.brand}`.toLowerCase().includes(pq.toLowerCase())))

  const submit = () => {
    setTouched(true)
    if (!valid) return
    onSave({ ...d, code, value: d.kind === 'free_shipping' ? 0 : d.value, target: d.appliesTo === 'all' ? undefined : d.target })
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={initial.id ? tx(`تعديل ${initial.code}`, `Edit ${initial.code}`) : tx('إنشاء خصم', 'Create discount')}
      width={620}
      footer={
        <>
          {onDelete &&
            (confirmDel ? (
              <button className="btn btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={onDelete}>
                {tx('تأكيد الحذف', 'Confirm delete')}
              </button>
            ) : (
              <button className="btn btn--ghost btn--danger" style={{ marginInlineEnd: 'auto' }} onClick={() => setConfirmDel(true)}>
                <Trash2 size={16} aria-hidden />
                {tx('حذف', 'Delete')}
              </button>
            ))}
          <button className="btn" onClick={onClose}>
            {tx('إلغاء', 'Cancel')}
          </button>
          <button className="btn btn--primary" onClick={submit}>
            {initial.id ? tx('حفظ', 'Save') : tx('إنشاء الخصم', 'Create discount')}
          </button>
        </>
      }
    >
      <form
        className="gr-form"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
      >
        <div className="gr-summary" aria-live="polite">
          <strong>{what}</strong>
          {lang === 'ar' ? '، ' : ', '}
          {how}
          {lang === 'ar' ? '، ' : ', '}
          {minText}
          {lang === 'ar' ? '، ' : ', '}
          {limitText}
          {lang === 'ar' ? '، ' : ', '}
          {when}.{!d.active && <> {tx('(متوقف حاليًا)', '(currently paused)')}</>}
        </div>

        {touched && !valid && <div className="field__error">{tx('فيه حقول محتاجة تتصلّح قبل الحفظ.', 'Some fields need fixing before saving.')}</div>}

        <div className="gr-toggle-row" style={{ paddingTop: 0 }}>
          <div>
            <div className="strong small">{tx('خصم تلقائي', 'Automatic discount')}</div>
            <div className="tiny faint">{tx('بيتطبّق من غير ما العميل يكتب كود. الكود بيفضل اسم داخلي.', 'Applies without the customer typing a code. The code stays as an internal name.')}</div>
          </div>
          <Switch checked={d.automatic} onChange={(v) => set('automatic', v)} label={tx('خصم تلقائي', 'Automatic discount')} />
        </div>

        <Field label={d.automatic ? tx('الاسم الداخلي', 'Internal name') : tx('الكود', 'Code')} error={show('code')} htmlFor="dc-code" hint={tx('حروف إنجليزية كبيرة وأرقام، علشان يتكتب بسهولة على الموبايل', 'Capital letters and digits, easy to type on a phone')}>
          <div className="row">
            <input id="dc-code" className="input gr-code" value={d.code} onChange={(e) => set('code', e.target.value.toUpperCase())} aria-invalid={!!show('code')} autoComplete="off" />
            <button type="button" className="btn" onClick={() => set('code', genCode(d.kind === 'free_shipping' ? 'SHIP' : 'BRIGHT'))}>
              {tx('توليد', 'Generate')}
            </button>
          </div>
        </Field>

        <div className="gr-form-2">
          <Field label={tx('العنوان بالعربي', 'Title in Arabic')} error={show('title')} htmlFor="dc-tar">
            <input id="dc-tar" className="input" dir="rtl" lang="ar" value={d.title.ar} onChange={(e) => set('title', { ...d.title, ar: e.target.value })} aria-invalid={!!show('title') && !d.title.ar.trim()} />
          </Field>
          <Field label={tx('العنوان بالإنجليزي', 'Title in English')} htmlFor="dc-ten">
            <input id="dc-ten" className="input" dir="ltr" lang="en" value={d.title.en} onChange={(e) => set('title', { ...d.title, en: e.target.value })} aria-invalid={!!show('title') && !d.title.en.trim()} />
          </Field>
        </div>

        <div className="gr-form-2">
          <Field label={tx('النوع', 'Type')} htmlFor="dc-kind">
            <select id="dc-kind" className="select" value={d.kind} onChange={(e) => set('kind', e.target.value as DiscountKind)}>
              {(Object.keys(KIND_LABEL) as DiscountKind[]).map((k) => (
                <option key={k} value={k}>
                  {pick(KIND_LABEL[k])}
                </option>
              ))}
            </select>
          </Field>
          {d.kind !== 'free_shipping' && (
            <Field
              label={d.kind === 'fixed' ? tx('المبلغ (ج.م)', 'Amount (EGP)') : d.kind === 'bogo' ? tx('خصم القطعة التانية ٪', 'Second item off (%)') : tx('النسبة ٪', 'Percent')}
              error={show('value')}
              htmlFor="dc-val"
            >
              <input id="dc-val" className="input num" type="number" min={0} value={Number.isFinite(d.value) ? d.value : ''} onChange={(e) => set('value', Number(e.target.value))} aria-invalid={!!show('value')} />
            </Field>
          )}
        </div>

        <div className="gr-form-2">
          <Field label={tx('حد أدنى للطلب (ج.م)', 'Minimum order (EGP)')} error={show('min')} htmlFor="dc-min" hint={tx('صفر = بدون حد', '0 = no minimum')}>
            <input id="dc-min" className="input num" type="number" min={0} value={d.minSubtotal} onChange={(e) => set('minSubtotal', Number(e.target.value))} />
          </Field>
          <Field label={tx('حد الاستخدام', 'Usage limit')} error={show('limit')} htmlFor="dc-lim" hint={tx('فاضي = بدون حد', 'Empty = unlimited')}>
            <input id="dc-lim" className="input num" type="number" min={1} value={d.usageLimit ?? ''} onChange={(e) => set('usageLimit', e.target.value === '' ? undefined : Number(e.target.value))} aria-invalid={!!show('limit')} />
          </Field>
        </div>

        <Field label={tx('ينطبق على', 'Applies to')} error={show('target')} htmlFor="dc-to">
          <select id="dc-to" className="select" value={d.appliesTo} onChange={(e) => setD((x) => ({ ...x, appliesTo: e.target.value as Discount['appliesTo'], target: [] }))}>
            <option value="all">{tx('كل المنتجات', 'All products')}</option>
            <option value="category">{tx('فئات محددة', 'Specific categories')}</option>
            <option value="brand">{tx('براندات محددة', 'Specific brands')}</option>
            <option value="products">{tx('منتجات محددة', 'Specific products')}</option>
          </select>
        </Field>
        {d.appliesTo === 'category' && (
          <div className="gr-chips" role="group" aria-label={tx('الفئات', 'Categories')}>
            {categories.map((c) => (
              <button key={c} type="button" className="gr-chip" aria-pressed={(d.target ?? []).includes(c)} onClick={() => toggleTarget(c)}>
                {pick(CATEGORY_LABEL[c])}
              </button>
            ))}
          </div>
        )}
        {d.appliesTo === 'brand' && (
          <div className="gr-chips" role="group" aria-label={tx('البراندات', 'Brands')}>
            {brands.map((b) => (
              <button key={b} type="button" className="gr-chip" aria-pressed={(d.target ?? []).includes(b)} onClick={() => toggleTarget(b)}>
                {b}
              </button>
            ))}
          </div>
        )}
        {d.appliesTo === 'products' && (
          <div className="stack" style={{ gap: 8 }}>
            <input className="input" type="search" value={pq} onChange={(e) => setPq(e.target.value)} placeholder={tx('بحث في المنتجات', 'Search products')} aria-label={tx('بحث في المنتجات', 'Search products')} />
            <div className="gr-checklist">
              {shownProducts.map((p) => (
                <label key={p.id}>
                  <input type="checkbox" className="check" checked={(d.target ?? []).includes(p.id)} onChange={() => toggleTarget(p.id)} />
                  <span className="ellipsis" style={{ flex: 1 }}>
                    {pick(p.name)}
                  </span>
                  <span className="tiny faint">{p.brand}</span>
                </label>
              ))}
              {shownProducts.length === 0 && <div className="small faint" style={{ padding: 10 }}>{tx('مفيش نتائج', 'No matches')}</div>}
            </div>
          </div>
        )}

        <div className="gr-form-2">
          <Field label={tx('يبدأ', 'Starts')} htmlFor="dc-start">
            <input id="dc-start" className="input num" type="date" value={dayVal(d.startsAt)} onChange={(e) => set('startsAt', fromDay(e.target.value) ?? new Date().toISOString())} />
          </Field>
          <Field label={tx('ينتهي', 'Ends')} error={show('dates')} htmlFor="dc-end" hint={tx('فاضي = بدون نهاية', 'Empty = no end date')}>
            <input id="dc-end" className="input num" type="date" value={dayVal(d.endsAt)} onChange={(e) => set('endsAt', fromDay(e.target.value, true))} aria-invalid={!!show('dates')} />
          </Field>
        </div>

        <div className="gr-toggle-row">
          <div>
            <div className="strong small">{tx('مفعّل', 'Active')}</div>
            <div className="tiny faint">{tx('الخصم المتوقف مش بيتطبّق حتى لو في مدته.', 'A paused discount doesn’t apply even within its dates.')}</div>
          </div>
          <Switch checked={d.active} onChange={(v) => set('active', v)} label={tx('مفعّل', 'Active')} />
        </div>
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
