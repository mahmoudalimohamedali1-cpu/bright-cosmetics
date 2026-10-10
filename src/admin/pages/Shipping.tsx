import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { GOVERNORATES } from '../../data/seed'
import { inRange, isCounted, rangeFor } from '../../lib/metrics'
import type { ShippingZone } from '../../data/types'
import { Badge, DemoNote, Field, PageHeader, Pane, Switch, useAdmin } from '../ui'
import { LedgerCell, Note, Takeaway } from '../parts/growth'

const COURIERS = [
  { id: 'Bosta', ar: 'بوسطة', en: 'Bosta', note: { ar: 'تغطية كل المحافظات وتحصيل COD', en: 'Nationwide, COD collection' } },
  { id: 'Aramex', ar: 'أرامكس', en: 'Aramex', note: { ar: 'مناسب للشحن الدولي والخليج', en: 'Good for international and Gulf' } },
  { id: 'J&T', ar: 'جي آند تي', en: 'J&T Express', note: { ar: 'أسعار منافسة داخل المدن', en: 'Competitive in-city rates' } },
  { id: 'Mylerz', ar: 'مايلرز', en: 'Mylerz', note: { ar: 'تحصيل ومرتجعات مرنة', en: 'Flexible COD and returns' } },
] as const

type Draft = { rate: string; freeOver: string; codFee: string; etaMin: string; etaMax: string; enabled: boolean }
const toDraft = (z: ShippingZone): Draft => ({ rate: String(z.rate), freeOver: String(z.freeOver), codFee: String(z.codFee), etaMin: String(z.etaDays[0]), etaMax: String(z.etaDays[1]), enabled: z.enabled })

export default function Shipping() {
  const { tx, pick, money, num, pct } = useI18n()
  const { toast, staff } = useAdmin()
  const zones = useStore((s) => s.zones)
  const orders = useStore((s) => s.orders)
  const settings = useStore((s) => s.settings)
  const updateZone = useStore((s) => s.updateZone)
  const updateSettings = useStore((s) => s.updateSettings)
  const log = useStore((s) => s.log)

  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const draftOf = (z: ShippingZone) => drafts[z.id] ?? toDraft(z)
  const setDraft = (z: ShippingZone, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [z.id]: { ...draftOf(z), ...patch } }))

  const [codMax, setCodMax] = useState<string | null>(null)
  const [calcGov, setCalcGov] = useState('cai')
  const [calcValue, setCalcValue] = useState('900')
  const [calcCod, setCalcCod] = useState(true)

  /* Last 30 days per zone */
  const { from, to } = rangeFor(30)
  const zoneStats = useMemo(() => {
    const zoneOf = (gid: string) => GOVERNORATES.find((g) => g.id === gid)?.zone ?? 'cairo'
    const m = new Map<string, { orders: number; free: number; charged: number; cod: number }>()
    for (const o of orders) {
      if (!isCounted(o) || !inRange(o, from, to)) continue
      const k = zoneOf(o.governorateId)
      const e = m.get(k) ?? { orders: 0, free: 0, charged: 0, cod: 0 }
      e.orders++
      if (o.shipping === 0) e.free++
      e.charged += o.shipping
      e.cod += o.codFee
      m.set(k, e)
    }
    return m
  }, [orders, from, to])
  const totalZoneOrders = [...zoneStats.values()].reduce((s, z) => s + z.orders, 0)
  const courierCounts = useMemo(() => {
    const m = new Map<string, number>()
    orders.forEach((o) => o.courier && inRange(o, from, to) && m.set(o.courier, (m.get(o.courier) ?? 0) + 1))
    return m
  }, [orders, from, to])
  const codStats = useMemo(() => {
    const os = orders.filter((o) => inRange(o, from, to))
    const cod = os.filter((o) => o.payment === 'cod')
    return { share: os.length ? cod.length / os.length : 0, cancel: cod.length ? cod.filter((o) => o.status === 'cancelled').length / cod.length : 0, over: cod.filter((o) => o.total > settings.codMax).length }
  }, [orders, from, to, settings.codMax])

  const errorsOf = (d: Draft) => {
    const e: Partial<Record<keyof Draft, string>> = {}
    const n = (s: string) => (s.trim() === '' ? NaN : Number(s))
    if (!(n(d.rate) >= 0)) e.rate = tx('رقم صفر أو أكتر', '0 or more')
    if (!(n(d.freeOver) >= 0)) e.freeOver = tx('رقم صفر أو أكتر', '0 or more')
    if (!(n(d.codFee) >= 0)) e.codFee = tx('رقم صفر أو أكتر', '0 or more')
    if (!(n(d.etaMin) >= 0) || !(n(d.etaMax) >= 0)) e.etaMin = tx('أيام صحيحة', 'Whole days')
    else if (n(d.etaMin) > n(d.etaMax)) e.etaMin = tx('الحد الأدنى أكبر من الأقصى', 'Min is above max')
    return e
  }

  const isDirty = (z: ShippingZone) => {
    const d = drafts[z.id]
    if (!d) return false
    const o = toDraft(z)
    return (Object.keys(o) as (keyof Draft)[]).some((k) => String(o[k]) !== String(d[k]))
  }

  const saveZone = (z: ShippingZone) => {
    const d = draftOf(z)
    if (Object.keys(errorsOf(d)).length) return
    updateZone({ ...z, rate: Number(d.rate), freeOver: Number(d.freeOver), codFee: Number(d.codFee), etaDays: [Number(d.etaMin), Number(d.etaMax)], enabled: d.enabled })
    log(staff, { ar: `عدّل أسعار شحن ${z.name.ar}`, en: `Updated shipping for ${z.name.en}` }, '/admin/shipping')
    toast(tx(`تم حفظ ${z.name.ar}`, `${z.name.en} saved`))
    setDrafts((x) => {
      const n = { ...x }
      delete n[z.id]
      return n
    })
  }

  /* Calculator */
  const calc = (() => {
    const g = GOVERNORATES.find((x) => x.id === calcGov)
    const z = zones.find((x) => x.id === g?.zone)
    const v = Math.max(0, Number(calcValue) || 0)
    if (!g || !z) return null
    const free = v >= z.freeOver
    const ship = free ? 0 : z.rate
    const codAllowed = settings.codEnabled && v <= settings.codMax
    const codFee = calcCod && codAllowed ? z.codFee : 0
    return { g, z, v, free, ship, codFee, codAllowed, total: v + ship + codFee, gap: free ? 0 : z.freeOver - v }
  })()

  const codMaxErr = codMax !== null && !(Number(codMax) > 0) ? tx('رقم أكبر من صفر', 'Must be more than zero') : undefined
  const cheapest = [...zones].filter((z) => z.enabled).sort((a, b) => a.rate - b.rate)[0]
  const priciest = [...zones].filter((z) => z.enabled).sort((a, b) => b.rate - a.rate)[0]

  return (
    <>
      <PageHeader
        title={tx('الشحن والمحافظات', 'Shipping and governorates')}
        description={
          <>
            {tx('سعر الشحن ومدة التوصيل ورسوم التحصيل لكل منطقة، مع تأثيرها على الطلبات الفعلية. ', 'Rate, delivery time and COD fee per zone, with their effect on actual orders. ')}
            <DemoNote />
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={tx('مناطق مفعّلة', 'Zones enabled')} value={<bdi dir="ltr">{`${num(zones.filter((z) => z.enabled).length)} / ${num(zones.length)}`}</bdi>} meta={tx(`${num(GOVERNORATES.length)} محافظة`, `${num(GOVERNORATES.length)} governorates`)} />
        <LedgerCell
          label={tx('طلبات بشحن مجاني', 'Orders shipped free')}
          value={pct(totalZoneOrders ? [...zoneStats.values()].reduce((s, z) => s + z.free, 0) / totalZoneOrders : 0, 0)}
          meta={tx('آخر 30 يوم', 'Last 30 days')}
        />
        <LedgerCell label={tx('شحن محصّل', 'Shipping collected')} value={money([...zoneStats.values()].reduce((s, z) => s + z.charged, 0))} meta={tx('آخر 30 يوم، من العملاء', 'Last 30 days, from customers')} />
        <LedgerCell label={tx('طلبات الدفع عند الاستلام', 'Cash on delivery orders')} value={pct(codStats.share, 0)} meta={tx(`نسبة إلغائها ${pct(codStats.cancel)}`, `${pct(codStats.cancel)} of them cancelled`)} to="/admin/analytics" />
      </div>

      <Pane title={tx('مناطق الشحن', 'Shipping zones')} description={tx('التعديل بيتطبّق على الطلبات الجديدة فقط', 'Changes apply to new orders only')} flush>
        <div style={{ padding: '12px 16px 0' }}>
          <Takeaway>
            {cheapest && priciest && (
              <>
                {tx('الشحن من ', 'Shipping runs from ')}
                <strong>{money(cheapest.rate)}</strong>
                {tx(` (${cheapest.name.ar}) لحد `, ` (${cheapest.name.en}) to `)}
                <strong>{money(priciest.rate)}</strong>
                {tx(` (${priciest.name.ar}). `, ` (${priciest.name.en}). `)}
              </>
            )}
            {tx('عمود «مجاني» بيوضح نسبة الطلبات اللي عدّت حد الشحن المجاني؛ لو عالية جدًا الحد ممكن يكون واطي.', 'The “free” column shows how many orders cleared the free-shipping threshold; if it’s very high, the threshold may be too low.')}
          </Takeaway>
        </div>
        <div className="table-wrap">
          <table className="table gr-table-tight">
            <thead>
              <tr>
                <th>{tx('المنطقة', 'Zone')}</th>
                <th>{tx('السعر', 'Rate')}</th>
                <th>{tx('مجاني فوق', 'Free over')}</th>
                <th>{tx('رسوم التحصيل', 'COD fee')}</th>
                <th>{tx('أيام التوصيل', 'Delivery days')}</th>
                <th className="t-num">{tx('طلبات 30 يوم', 'Orders, 30d')}</th>
                <th className="t-num">{tx('مجاني', 'Free')}</th>
                <th>{tx('مفعّلة', 'On')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const d = draftOf(z)
                const err = errorsOf(d)
                const st = zoneStats.get(z.id)
                const govs = GOVERNORATES.filter((g) => g.zone === z.id)
                const numInput = (k: 'rate' | 'freeOver' | 'codFee', label: string) => (
                  <>
                    <input className="input num gr-input-cell" type="number" min={0} value={d[k]} onChange={(e) => setDraft(z, { [k]: e.target.value })} aria-label={`${pick(z.name)}: ${label}`} aria-invalid={!!err[k]} />
                    {err[k] && <div className="field__error">{err[k]}</div>}
                  </>
                )
                return (
                  <tr key={z.id}>
                    <td style={{ minWidth: 200 }}>
                      <div className="strong">{pick(z.name)}</div>
                      <div className="tiny faint" style={{ maxWidth: 280 }}>
                        {govs.map((g, i) => (
                          <span key={g.id}>
                            <Link to={`/admin/customers?gov=${g.id}`} style={{ color: 'inherit' }}>
                              {pick(g.name)}
                            </Link>
                            {i < govs.length - 1 ? '، ' : ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{numInput('rate', tx('السعر', 'Rate'))}</td>
                    <td>{numInput('freeOver', tx('مجاني فوق', 'Free over'))}</td>
                    <td>{numInput('codFee', tx('رسوم التحصيل', 'COD fee'))}</td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <input className="input num gr-input-cell" style={{ width: 56 }} type="number" min={0} value={d.etaMin} onChange={(e) => setDraft(z, { etaMin: e.target.value })} aria-label={`${pick(z.name)}: ${tx('أقل مدة', 'Minimum days')}`} aria-invalid={!!err.etaMin} />
                        <span className="faint">–</span>
                        <input className="input num gr-input-cell" style={{ width: 56 }} type="number" min={0} value={d.etaMax} onChange={(e) => setDraft(z, { etaMax: e.target.value })} aria-label={`${pick(z.name)}: ${tx('أقصى مدة', 'Maximum days')}`} aria-invalid={!!err.etaMin} />
                      </div>
                      {err.etaMin && <div className="field__error">{err.etaMin}</div>}
                    </td>
                    <td className="t-num">{num(st?.orders ?? 0)}</td>
                    <td className="t-num">{pct(st?.orders ? st.free / st.orders : 0, 0)}</td>
                    <td>
                      <Switch checked={d.enabled} onChange={(v) => setDraft(z, { enabled: v })} label={tx(`تفعيل ${z.name.ar}`, `Enable ${z.name.en}`)} />
                    </td>
                    <td>
                      <button className="btn btn--sm btn--primary" disabled={!isDirty(z) || Object.keys(err).length > 0} onClick={() => saveZone(z)}>
                        {tx('حفظ', 'Save')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Pane>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Pane title={tx('حاسبة تكلفة الشحن', 'Shipping cost calculator')} description={tx('اللي العميل هيدفعه فعلًا عند الدفع', 'What the customer will actually pay at checkout')}>
          <div className="gr-form">
            <div className="gr-form-2">
              <Field label={tx('المحافظة', 'Governorate')} htmlFor="calc-gov">
                <select id="calc-gov" className="select" value={calcGov} onChange={(e) => setCalcGov(e.target.value)}>
                  {GOVERNORATES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {pick(g.name)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tx('قيمة السلة (ج.م)', 'Cart value (EGP)')} htmlFor="calc-val">
                <input id="calc-val" className="input num" type="number" min={0} value={calcValue} onChange={(e) => setCalcValue(e.target.value)} />
              </Field>
            </div>
            <label className="row small">
              <Switch checked={calcCod} onChange={setCalcCod} label={tx('الدفع عند الاستلام', 'Cash on delivery')} />
              {tx('الدفع عند الاستلام', 'Cash on delivery')}
            </label>
            {calc && (
              <div className="gr-calc-out" aria-live="polite">
                {!calc.z.enabled && <Badge tone="bad">{tx('الشحن للمنطقة دي متوقف', 'Shipping to this zone is off')}</Badge>}
                <div className="row-between">
                  <span className="muted">{tx('المنطقة', 'Zone')}</span>
                  <span>
                    {pick(calc.z.name)}{' '}
                    <span className="faint small">{tx(`(${calc.z.etaDays[0]}–${calc.z.etaDays[1]} يوم)`, `(${calc.z.etaDays[0]}–${calc.z.etaDays[1]} days)`)}</span>
                  </span>
                </div>
                <div className="row-between">
                  <span className="muted">{tx('الشحن', 'Shipping')}</span>
                  <span className="num">{calc.free ? <Badge tone="ok">{tx('مجاني', 'Free')}</Badge> : money(calc.ship)}</span>
                </div>
                {!calc.free && (
                  <div className="row-between">
                    <span className="muted">{tx('للشحن المجاني', 'To free shipping')}</span>
                    <span className="num small">{tx(`باقي ${money(calc.gap)}`, `${money(calc.gap)} more`)}</span>
                  </div>
                )}
                {calcCod && (
                  <div className="row-between">
                    <span className="muted">{tx('رسوم التحصيل', 'COD fee')}</span>
                    <span className="num">{calc.codAllowed ? money(calc.codFee) : <Badge tone="warn">{settings.codEnabled ? tx(`غير متاح فوق ${money(settings.codMax)}`, `Not available over ${money(settings.codMax)}`) : tx('الدفع عند الاستلام متوقف', 'COD is off')}</Badge>}</span>
                  </div>
                )}
                <div className="row-between">
                  <span>{tx('الإجمالي', 'Total')}</span>
                  <span className="num">{money(calc.total)}</span>
                </div>
              </div>
            )}
          </div>
        </Pane>

        <div className="stack">
          <Pane title={tx('الدفع عند الاستلام', 'Cash on delivery')}>
            <div className="gr-toggle-row">
              <div>
                <div className="small strong">{tx('الدفع عند الاستلام متاح', 'Cash on delivery available')}</div>
                <div className="tiny faint">{tx(`${pct(codStats.share, 0)} من طلبات آخر 30 يوم`, `${pct(codStats.share, 0)} of orders in the last 30 days`)}</div>
              </div>
              <Switch
                checked={settings.codEnabled}
                onChange={(v) => {
                  updateSettings({ codEnabled: v })
                  log(staff, { ar: `${v ? 'فعّل' : 'أوقف'} الدفع عند الاستلام`, en: `${v ? 'Enabled' : 'Disabled'} cash on delivery` }, '/admin/shipping')
                  toast(v ? tx('تم تفعيل الدفع عند الاستلام', 'Cash on delivery on') : tx('تم إيقاف الدفع عند الاستلام', 'Cash on delivery off'))
                }}
                label={tx('الدفع عند الاستلام متاح', 'Cash on delivery available')}
              />
            </div>
            <form
              style={{ marginTop: 12 }}
              onSubmit={(e) => {
                e.preventDefault()
                if (codMax === null || codMaxErr) return
                updateSettings({ codMax: Number(codMax) })
                toast(tx('تم حفظ الحد الأقصى', 'Maximum saved'))
                setCodMax(null)
              }}
            >
              <Field label={tx('أقصى قيمة طلب بالدفع عند الاستلام', 'Maximum COD order value')} error={codMaxErr} hint={tx(`${num(codStats.over)} طلب في آخر 30 يوم كان فوق الحد ده`, `${num(codStats.over)} orders in the last 30 days were above this`)} htmlFor="cod-max">
                <div className="row">
                  <div className="input-group" style={{ flex: 1 }}>
                    <span className="addon">{tx('ج.م', 'EGP')}</span>
                    <input id="cod-max" className="input num" type="number" min={1} value={codMax ?? settings.codMax} onChange={(e) => setCodMax(e.target.value)} disabled={!settings.codEnabled} aria-invalid={!!codMaxErr} />
                  </div>
                  <button className="btn btn--primary" type="submit" disabled={codMax === null || !!codMaxErr || Number(codMax) === settings.codMax}>
                    {tx('حفظ', 'Save')}
                  </button>
                </div>
              </Field>
            </form>
          </Pane>

          <Pane title={tx('شركات الشحن', 'Couriers')} flush>
            <ul className="list">
              {COURIERS.map((c) => (
                <li key={c.id}>
                  <Truck size={18} aria-hidden className="faint" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="strong small">{tx(c.ar, c.en)}</div>
                    <div className="tiny faint">{pick(c.note)}</div>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <Badge tone="hollow">{tx('غير متصل (تجريبي)', 'Not connected (demo)')}</Badge>
                    <div className="tiny faint num" style={{ marginTop: 2 }}>
                      {tx(`${num(courierCounts.get(c.id) ?? 0)} شحنة في 30 يوم`, `${num(courierCounts.get(c.id) ?? 0)} shipments in 30d`)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="pane__foot">
              <Note>{tx('الربط بشركات الشحن (إنشاء البوليصة والتتبّع التلقائي) محتاج مفاتيح API من كل شركة. الأرقام هنا من حقل شركة الشحن في الطلبات.', 'Courier integration (waybills and automatic tracking) needs API keys from each courier. Counts come from the courier field on orders.')}</Note>
            </div>
          </Pane>
        </div>
      </div>
    </>
  )
}
