import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, MessageCircle } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import type { AbandonedCart } from '../../data/types'
import { Avatar, Badge, DemoNote, Empty, PageHeader, Pane, Seg, Switch, Tabs, Thumb, useAdmin } from '../ui'
import { LedgerCell, Note, Takeaway } from '../parts/growth'
import { downloadCSV, firstName, today, waLink } from '../parts/growth/util'

type Tab = 'open' | 'recovered' | 'all'

const STAGES: AbandonedCart['stage'][] = ['cart', 'checkout_info', 'checkout_shipping', 'checkout_payment']
const STAGE_LABEL: Record<AbandonedCart['stage'], { ar: string; en: string }> = {
  cart: { ar: 'السلة', en: 'Cart' },
  checkout_info: { ar: 'بيانات التواصل', en: 'Contact details' },
  checkout_shipping: { ar: 'العنوان والشحن', en: 'Shipping' },
  checkout_payment: { ar: 'الدفع', en: 'Payment' },
}

export default function Abandoned() {
  const { tx, pick, money, num, pct, relTime, lang: uiLang } = useI18n()
  const { toast, staff } = useAdmin()
  const abandoned = useStore((s) => s.abandoned)
  const customers = useStore((s) => s.customers)
  const products = useStore((s) => s.products)
  const discounts = useStore((s) => s.discounts)
  const markRecovered = useStore((s) => s.markRecovered)
  const sendReminder = useStore((s) => s.sendReminder)
  const log = useStore((s) => s.log)

  const [tab, setTab] = useState<Tab>('open')
  const [auto1h, setAuto1h] = useState(true)
  const [auto24h, setAuto24h] = useState(false)
  const [code, setCode] = useState('')
  const [msgLang, setMsgLang] = useState<'ar' | 'en'>(uiLang)

  const codeOptions = discounts.filter((d) => d.active && !d.automatic && (!d.endsAt || new Date(d.endsAt).getTime() > Date.now()))

  const rows = useMemo(
    () =>
      [...abandoned]
        .filter((a) => (tab === 'all' ? true : tab === 'open' ? !a.recovered : a.recovered))
        .sort((a, b) => (tab === 'open' ? b.total - a.total : b.createdAt.localeCompare(a.createdAt))),
    [abandoned, tab],
  )

  const stats = useMemo(() => {
    const open = abandoned.filter((a) => !a.recovered)
    const rec = abandoned.filter((a) => a.recovered)
    const reminded = abandoned.filter((a) => a.remindersSent > 0)
    const remindedRec = reminded.filter((a) => a.recovered).length
    const silent = abandoned.filter((a) => a.remindersSent === 0)
    const silentRec = silent.filter((a) => a.recovered).length
    const byStage = STAGES.map((s) => ({ s, n: open.filter((a) => a.stage === s).length, value: open.filter((a) => a.stage === s).reduce((x, a) => x + a.total, 0) }))
    return {
      total: abandoned.length,
      atStake: open.reduce((s, a) => s + a.total, 0),
      open: open.length,
      rate: abandoned.length ? rec.length / abandoned.length : 0,
      recRevenue: rec.reduce((s, a) => s + a.total, 0),
      remindedRate: reminded.length ? remindedRec / reminded.length : 0,
      silentRate: silent.length ? silentRec / silent.length : 0,
      reminded: reminded.length,
      byStage,
      payStage: byStage.find((b) => b.s === 'checkout_payment')!,
    }
  }, [abandoned])

  const cust = (a: AbandonedCart) => customers.find((c) => c.id === a.customerId)

  const message = (a: AbandonedCart) => {
    const c = cust(a)
    const items = a.lines
      .map((l) => products.find((p) => p.id === l.productId))
      .filter((p) => !!p)
      .map((p) => `- ${p!.name[msgLang]}`)
      .join('\n')
    const link = `${window.location.origin}/`
    const nm = c ? firstName(c.name[msgLang]) : ''
    if (msgLang === 'ar')
      return `أهلًا${nm ? ` ${nm}` : ''}، معاكي برايت.\nسلتك لسه مستنياكي:\n${items}\nالإجمالي ${Math.round(a.total).toLocaleString('en')} ج.م.${code ? `\nاستخدمي الكود ${code} وخدي خصم إضافي.` : ''}\nتقدري تكمّلي من هنا: ${link}\nولو فيه أي سؤال عن نوع بشرتك احنا هنا.`
    return `Hi${nm ? ` ${nm}` : ''}, it’s Bright.\nYour cart is still waiting:\n${items}\nTotal EGP ${Math.round(a.total).toLocaleString('en')}.${code ? `\nUse code ${code} for an extra discount.` : ''}\nPick up where you left off: ${link}\nAny questions about your skin type? We’re here.`
  }

  const remind = (a: AbandonedCart) => {
    if (!a.phone) return
    window.open(waLink(a.phone, message(a)), '_blank', 'noopener')
    sendReminder(a.id)
    log(staff, { ar: `بعت تذكير سلة متروكة بقيمة ${Math.round(a.total)} ج.م`, en: `Sent abandoned-cart reminder worth EGP ${Math.round(a.total)}` }, '/admin/abandoned')
    toast(tx('تم تسجيل التذكير', 'Reminder logged'))
  }
  const recover = (a: AbandonedCart) => {
    markRecovered(a.id)
    log(staff, { ar: `علّم سلة بقيمة ${Math.round(a.total)} ج.م كمستردة`, en: `Marked a EGP ${Math.round(a.total)} cart as recovered` }, '/admin/abandoned')
    toast(tx('تم تعليم السلة كمستردة', 'Cart marked as recovered'))
  }

  const exportCSV = () =>
    downloadCSV(
      `nuri-abandoned-carts-${today()}.csv`,
      ['id', 'customer', 'phone', 'created', 'stage', 'items', 'value_egp', 'reminders', 'recovered'],
      abandoned.map((a) => [a.id, cust(a)?.name.en ?? 'Guest', a.phone ?? '', a.createdAt, a.stage, a.lines.map((l) => products.find((p) => p.id === l.productId)?.name.en).join(' | '), Math.round(a.total), a.remindersSent, a.recovered ? 'yes' : 'no']),
    )

  return (
    <>
      <PageHeader
        title={tx('السلال المتروكة', 'Abandoned carts')}
        description={
          <>
            {tx('ناس بدأت تشتري وما كمّلتش. تذكير على واتساب في الوقت الصح بيرجّع جزء كبير منهم. ', 'People who started buying and stopped. A timely WhatsApp nudge brings many back. ')}
            <DemoNote />
          </>
        }
        actions={
          <button className="btn" onClick={exportCSV}>
            <Download size={16} aria-hidden />
            {tx('تصدير', 'Export')}
          </button>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={tx('سلال متروكة', 'Abandoned carts')} value={num(stats.total)} meta={tx(`${num(stats.open)} لسه مفتوحة`, `${num(stats.open)} still open`)} />
        <LedgerCell label={tx('قيمة معلّقة', 'Value at stake')} value={money(stats.atStake)} meta={tx('في السلال المفتوحة', 'In open carts')} />
        <LedgerCell label={tx('نسبة الاسترداد', 'Recovery rate')} value={pct(stats.rate, 0)} meta={tx(`مع تذكير ${pct(stats.remindedRate, 0)}، من غيره ${pct(stats.silentRate, 0)}`, `With a reminder ${pct(stats.remindedRate, 0)}, without ${pct(stats.silentRate, 0)}`)} />
        <LedgerCell label={tx('إيراد مسترد', 'Recovered revenue')} value={money(stats.recRevenue)} meta={tx('قيمة السلال وقت تركها', 'Cart value when abandoned')} />
      </div>

      <div className="grid grid-main">
        <section className="pane pane--flush">
          <div style={{ padding: '0 12px' }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'open', label: tx('مفتوحة', 'Open'), count: stats.open },
                { value: 'recovered', label: tx('مستردة', 'Recovered'), count: stats.total - stats.open },
                { value: 'all', label: tx('الكل', 'All'), count: stats.total },
              ]}
            />
          </div>
          {stats.payStage.n > 0 && tab === 'open' && (
            <div style={{ padding: '12px 16px 0' }}>
              <Takeaway>
                <strong>{tx(`${num(stats.payStage.n)} سلة`, `${num(stats.payStage.n)} carts`)}</strong>
                {tx(` وقفت عند خطوة الدفع بقيمة ${money(stats.payStage.value)}؛ دول أقرب ناس للشراء، فالترتيب هنا بالأعلى قيمة.`, ` stopped at payment, worth ${money(stats.payStage.value)}. They were closest to buying; the list is sorted by value.`)}
              </Takeaway>
            </div>
          )}
          {rows.length === 0 ? (
            <Empty title={tab === 'open' ? tx('مفيش سلال مفتوحة', 'No open carts') : tx('مفيش سلال هنا', 'No carts here')}>
              {tab === 'open' ? tx('كل السلال اتردّت أو اتقفلت.', 'Every cart has been recovered or closed.') : tx('السلال المستردة بتظهر هنا.', 'Recovered carts show here.')}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{tx('العميل', 'Customer')}</th>
                    <th>{tx('المنتجات', 'Items')}</th>
                    <th className="t-num">{tx('القيمة', 'Value')}</th>
                    <th>{tx('وصل لحد', 'Reached')}</th>
                    <th className="gr-hide-md">{tx('من', 'When')}</th>
                    <th className="t-num">{tx('تذكيرات', 'Reminders')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const c = cust(a)
                    const stageIdx = STAGES.indexOf(a.stage)
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="row" style={{ gap: 10 }}>
                            <Avatar name={c ? pick(c.name) : '؟'} />
                            <div style={{ minWidth: 0 }}>
                              {c ? (
                                <Link to={`/admin/customers/${c.id}`} className="strong small" style={{ color: 'inherit' }}>
                                  {pick(c.name)}
                                </Link>
                              ) : (
                                <span className="small muted">{tx('زائر', 'Guest')}</span>
                              )}
                              <div className="tiny faint num gr-ltr">{a.phone ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="gr-thumbs" title={a.lines.map((l) => pick(products.find((p) => p.id === l.productId)?.name)).join('، ')}>
                            {a.lines.slice(0, 3).map((l, i) => {
                              const p = products.find((x) => x.id === l.productId)
                              return p ? (
                                <Link key={i} to={`/admin/products/${p.id}`} aria-label={pick(p.name)}>
                                  <Thumb product={p} />
                                </Link>
                              ) : null
                            })}
                            {a.lines.length > 3 && <span className="tiny faint">+{a.lines.length - 3}</span>}
                          </div>
                        </td>
                        <td className="t-num strong">{money(a.total)}</td>
                        <td>
                          <div className="gr-stage" aria-hidden>
                            {STAGES.map((s, i) => (
                              <span key={s} className={i <= stageIdx ? 'on' : undefined} />
                            ))}
                          </div>
                          <div className="tiny muted">{pick(STAGE_LABEL[a.stage])}</div>
                        </td>
                        <td className="small muted gr-hide-md" style={{ whiteSpace: 'nowrap' }}>
                          {relTime(a.createdAt)}
                        </td>
                        <td className="t-num">{num(a.remindersSent)}</td>
                        <td>
                          {a.recovered ? (
                            <Badge tone="ok">{tx('مستردة', 'Recovered')}</Badge>
                          ) : (
                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn btn--sm" onClick={() => remind(a)} disabled={!a.phone}>
                                <MessageCircle size={14} aria-hidden />
                                {tx('تذكير واتساب', 'WhatsApp reminder')}
                              </button>
                              <button className="btn btn--sm btn--ghost btn--icon" onClick={() => recover(a)} aria-label={tx('تعليم كمستردة', 'Mark recovered')} title={tx('تعليم كمستردة', 'Mark recovered')}>
                                <Check size={14} />
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

        <div className="stack">
          <Pane title={tx('رسالة التذكير', 'Reminder message')}>
            <div className="stack" style={{ gap: 12 }}>
              <div className="row-between">
                <span className="small muted">{tx('اللغة', 'Language')}</span>
                <Seg
                  label={tx('لغة الرسالة', 'Message language')}
                  value={msgLang}
                  onChange={setMsgLang}
                  options={[
                    { value: 'ar', label: 'العربية' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </div>
              <label className="field">
                <span className="field__label">{tx('كود خصم في الرسالة', 'Discount code in message')}</span>
                <select className="select" value={code} onChange={(e) => setCode(e.target.value)}>
                  <option value="">{tx('من غير كود', 'No code')}</option>
                  {codeOptions.map((d) => (
                    <option key={d.id} value={d.code}>
                      {d.code} ({pick(d.title)})
                    </option>
                  ))}
                </select>
                <span className="field__hint">{tx('الخصم بيقلّل الهامش؛ أول تذكير غالبًا بيكفي من غيره.', 'A discount cuts margin; a first reminder often works without one.')}</span>
              </label>
              {rows[0] && !rows[0].recovered && (
                <div>
                  <div className="field__label" style={{ marginBottom: 6 }}>
                    {tx('معاينة لأول سلة', 'Preview for the first cart')}
                  </div>
                  <div className="gr-bubble small" dir={msgLang === 'ar' ? 'rtl' : 'ltr'} lang={msgLang}>
                    {message(rows[0])}
                  </div>
                </div>
              )}
            </div>
          </Pane>

          <Pane title={tx('التذكير التلقائي', 'Automatic reminders')}>
            <div className="gr-toggle-row">
              <div>
                <div className="small strong">{tx('بعد ساعة', 'After 1 hour')}</div>
                <div className="tiny faint">{tx('وهي لسه فاكرة السلة', 'While the cart is still fresh')}</div>
              </div>
              <Switch checked={auto1h} onChange={setAuto1h} label={tx('تذكير بعد ساعة', 'Reminder after 1 hour')} />
            </div>
            <div className="gr-toggle-row">
              <div>
                <div className="small strong">{tx('بعد 24 ساعة', 'After 24 hours')}</div>
                <div className="tiny faint">{tx('تذكير تاني ومعاه الكود لو اتحدد', 'Second nudge, with the code if one is set')}</div>
              </div>
              <Switch checked={auto24h} onChange={setAuto24h} label={tx('تذكير بعد 24 ساعة', 'Reminder after 24 hours')} />
            </div>
            <div style={{ marginTop: 12 }}>
              <Note>{tx('الإرسال التلقائي محتاج ربط WhatsApp Business API، وده غير متصل. الإعدادات دي مش بتتحفظ ولا بتبعت حاجة لحد الربط.', 'Automatic sending needs the WhatsApp Business API connection, which is not set up. These settings are not saved and nothing is sent until it is.')}</Note>
            </div>
          </Pane>
        </div>
      </div>
    </>
  )
}
