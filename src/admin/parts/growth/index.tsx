import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, Info, Mail, MessageCircle, Star } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { useStore } from '../../../store'
import { customerStats, SEGMENT_LABEL } from '../../../lib/metrics'
import type { Segment } from '../../../lib/metrics'
import type { Customer } from '../../../data/types'
import { uid } from '../../../lib/rand'
import { Badge, Drawer, Field, Seg, Switch, useAdmin } from '../../ui'
import { copyText, downloadCSV, fill, firstName, genCode, SEGMENT_TONE, today, waLink } from './util'
import './growth.css'

/* ───────── Shared data hook ───────── */

export function useCustomerStats() {
  const customers = useStore((s) => s.customers)
  const orders = useStore((s) => s.orders)
  return useMemo(() => customerStats(customers, orders), [customers, orders])
}

/* ───────── Atoms ───────── */

export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  const { tx, num } = useI18n()
  const full = Math.round(value)
  return (
    <span className="gr-stars" role="img" aria-label={label ?? tx(`${num(value, { maximumFractionDigits: 1 })} من 5`, `${num(value, { maximumFractionDigits: 1 })} out of 5`)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= full ? 'on' : undefined} strokeWidth={1.75} aria-hidden />
      ))}
    </span>
  )
}

export function SegmentBadge({ s }: { s: Segment }) {
  const { pick } = useI18n()
  return <Badge tone={SEGMENT_TONE[s]}>{pick(SEGMENT_LABEL[s])}</Badge>
}

/** One cell of a .ledger strip; becomes a link when `to` is given. */
export function LedgerCell({ label, value, meta, to }: { label: ReactNode; value: ReactNode; meta?: ReactNode; to?: string }) {
  const body = (
    <>
      <div className="ledger__label">{label}</div>
      <div className="ledger__value">{value}</div>
      {meta && <div className="ledger__meta">{meta}</div>}
    </>
  )
  return to ? (
    <Link to={to} className="ledger__cell">
      {body}
    </Link>
  ) : (
    <div className="ledger__cell">{body}</div>
  )
}

export function Takeaway({ children }: { children: ReactNode }) {
  return <p className="gr-take">{children}</p>
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="gr-note">
      <Info size={14} aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export type BarItem = { key: string; label: ReactNode; value: number; display: ReactNode; to?: string }

/** Horizontal bar list: single hue, value in text ink beside each bar. */
export function BarList({ items, max }: { items: BarItem[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="gr-bars">
      {items.map((it) => (
        <li key={it.key}>
          {it.to ? (
            <Link to={it.to} className="gr-bars__label">
              {it.label}
            </Link>
          ) : (
            <span className="gr-bars__label">{it.label}</span>
          )}
          <span className="gr-bars__track" aria-hidden>
            <span className="gr-bars__fill" style={{ width: `${Math.max(0, (it.value / top) * 100)}%` }} />
          </span>
          <span className="gr-bars__val">{it.display}</span>
        </li>
      ))}
    </ul>
  )
}

/* ───────── Campaign composer (WhatsApp / email) ───────── */

export function Composer({
  open,
  onClose,
  recipients,
  title,
  context,
  defaults,
  offerDiscount,
}: {
  open: boolean
  onClose: () => void
  recipients: Customer[]
  title: string
  /** Short name of the audience, used for the discount title */
  context: { ar: string; en: string }
  defaults: { ar: string; en: string }
  offerDiscount?: boolean
}) {
  const { tx, pick, num, lang: uiLang } = useI18n()
  const { toast, staff, can } = useAdmin()
  const discounts = useStore((s) => s.discounts)
  const upsertDiscount = useStore((s) => s.upsertDiscount)
  const log = useStore((s) => s.log)
  const storeName = useStore((s) => s.settings.storeName)

  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [lang, setLang] = useState<'ar' | 'en'>(uiLang)
  const [msg, setMsg] = useState(defaults)
  const [consentOnly, setConsentOnly] = useState(true)
  const [withCode, setWithCode] = useState(false)
  const [code, setCode] = useState(() => genCode())
  const [pct, setPct] = useState(10)
  const [days, setDays] = useState(7)
  const [created, setCreated] = useState<string | null>(null)

  const eligible = recipients.filter((c) => (!consentOnly || c.acceptsMarketing) && (channel === 'whatsapp' ? !!c.phone : !!c.email))
  const excluded = recipients.length - eligible.length
  const first = eligible[0]
  const template = msg[lang]
  const vars = (c?: Customer) => ({ name: c ? firstName(c.name[lang]) : lang === 'ar' ? 'حبيبتنا' : 'there', code: withCode ? (created ?? code) : '' })
  const preview = fill(template, vars(first))

  const codeTaken = discounts.some((d) => d.code.toUpperCase() === code.trim().toUpperCase())
  const codeValid = /^[A-Z0-9_-]{3,20}$/.test(code.trim().toUpperCase())
  const codeError = !withCode || created ? undefined : !codeValid ? tx('من 3 إلى 20 حرف إنجليزي أو رقم بدون مسافات', '3–20 letters or digits, no spaces') : codeTaken ? tx('الكود ده مستخدم قبل كده', 'This code already exists') : undefined
  const pctError = withCode && (pct < 1 || pct > 90) ? tx('النسبة بين 1 و90', 'Between 1 and 90') : undefined

  const createCode = () => {
    if (codeError || pctError) return
    const c = code.trim().toUpperCase()
    upsertDiscount({
      id: uid('d'),
      code: c,
      title: { ar: `حملة: ${context.ar}`, en: `Campaign: ${context.en}` },
      kind: 'percent',
      value: pct,
      minSubtotal: 0,
      usageLimit: Math.max(1, eligible.length),
      used: 0,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + days * 86400000).toISOString(),
      active: true,
      automatic: false,
      appliesTo: 'all',
    })
    log(staff, { ar: `أنشأ كود حملة ${c} لشريحة ${context.ar}`, en: `Created campaign code ${c} for ${context.en}` }, '/admin/discounts')
    setCreated(c)
    toast(tx(`تم إنشاء الكود ${c}`, `Code ${c} created`))
  }

  const exportList = () => {
    downloadCSV(
      `nuri-campaign-${today()}.csv`,
      ['name', 'phone', 'email', 'message'],
      eligible.map((c) => [c.name[lang], c.phone, c.email, fill(template, vars(c))]),
    )
  }

  const CODE_LINE = { ar: '\nكود الخصم: {code}', en: '\nYour code: {code}' }
  const toggleCode = (on: boolean) => {
    setWithCode(on)
    setMsg((m) =>
      on
        ? { ar: m.ar.includes('{code}') ? m.ar : m.ar + CODE_LINE.ar, en: m.en.includes('{code}') ? m.en : m.en + CODE_LINE.en }
        : { ar: m.ar.replace(CODE_LINE.ar, ''), en: m.en.replace(CODE_LINE.en, '') },
    )
  }

  const missingCodeVar = withCode && !template.includes('{code}')

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      width={600}
      footer={
        <>
          <button className="btn" onClick={exportList} disabled={!eligible.length}>
            <Download size={16} aria-hidden />
            {tx('تصدير القائمة', 'Export list')}
          </button>
          <button
            className="btn"
            disabled={!template.trim()}
            onClick={async () => toast((await copyText(template)) ? tx('تم نسخ الرسالة', 'Message copied') : tx('تعذّر النسخ', 'Could not copy'))}
          >
            <Copy size={16} aria-hidden />
            {tx('نسخ الرسالة', 'Copy message')}
          </button>
          {channel === 'whatsapp' ? (
            <a
              className="btn btn--primary"
              href={first ? waLink(first.phone, preview) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!first || !template.trim()}
            >
              <MessageCircle size={16} aria-hidden />
              {tx('فتح واتساب لأول مستلم', 'Open WhatsApp for first recipient')}
            </a>
          ) : (
            <a
              className="btn btn--primary"
              href={first ? `mailto:${first.email}?subject=${encodeURIComponent(pick(storeName))}&body=${encodeURIComponent(preview)}` : undefined}
              aria-disabled={!first || !template.trim()}
            >
              <Mail size={16} aria-hidden />
              {tx('فتح البريد لأول مستلم', 'Open email for first recipient')}
            </a>
          )}
        </>
      }
    >
      <div className="gr-form">
        <div className="row-between" style={{ flexWrap: 'wrap' }}>
          <Seg
            label={tx('القناة', 'Channel')}
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'whatsapp', label: tx('واتساب', 'WhatsApp') },
              { value: 'email', label: tx('بريد إلكتروني', 'Email') },
            ]}
          />
          <Seg
            label={tx('لغة الرسالة', 'Message language')}
            value={lang}
            onChange={setLang}
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>

        <div className="ledger" style={{ ['--cols' as string]: 2 }}>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('هيستلموا الرسالة', 'Will receive it')}</div>
            <div className="ledger__value">{num(eligible.length)}</div>
            <div className="ledger__meta">{tx(`من ${num(recipients.length)} في الشريحة`, `of ${num(recipients.length)} in this audience`)}</div>
          </div>
          <div className="ledger__cell">
            <div className="ledger__label">{tx('مستبعدين', 'Excluded')}</div>
            <div className="ledger__value">{num(excluded)}</div>
            <div className="ledger__meta">{consentOnly ? tx('بدون موافقة تسويق أو بدون وسيلة تواصل', 'No marketing consent or no contact') : tx('بدون وسيلة تواصل', 'No contact detail')}</div>
          </div>
        </div>

        <div className="gr-toggle-row">
          <div>
            <div className="strong small">{tx('الموافقين على التسويق فقط', 'Only customers who accept marketing')}</div>
            <div className="tiny faint">{tx('الإرسال لغير الموافقين ممكن يعرّض الرقم للحظر.', 'Messaging people without consent risks the number being blocked.')}</div>
          </div>
          <Switch checked={consentOnly} onChange={setConsentOnly} label={tx('الموافقين على التسويق فقط', 'Only customers who accept marketing')} />
        </div>

        <Field
          label={lang === 'ar' ? tx('نص الرسالة (عربي)', 'Message (Arabic)') : tx('نص الرسالة (إنجليزي)', 'Message (English)')}
          hint={tx('المتغيرات: {name} الاسم الأول، {code} كود الخصم', 'Variables: {name} first name, {code} discount code')}
          htmlFor="gr-msg"
        >
          <textarea
            id="gr-msg"
            className="textarea"
            rows={6}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            lang={lang}
            value={template}
            onChange={(e) => setMsg((m) => ({ ...m, [lang]: e.target.value }))}
            aria-invalid={!template.trim()}
          />
        </Field>
        {!template.trim() && <span className="field__error">{tx('الرسالة فاضية', 'The message is empty')}</span>}

        {offerDiscount && can('marketing.edit') && (
          <div className="pane">
            <div className="pane__body stack" style={{ gap: 12 }}>
              <div className="row-between">
                <div>
                  <div className="strong small">{tx('كود خصم خاص بالحملة', 'Campaign discount code')}</div>
                  <div className="tiny faint">{tx('كود بحد استخدام يساوي عدد المستلمين، علشان العائد يتقاس.', 'Usage limit equals the audience size, so the return can be measured.')}</div>
                </div>
                <Switch checked={withCode} onChange={toggleCode} label={tx('كود خصم خاص بالحملة', 'Campaign discount code')} />
              </div>
              {withCode && (
                <>
                  <div className="gr-form-2">
                    <Field label={tx('الكود', 'Code')} error={codeError} htmlFor="gr-code">
                      <div className="row">
                        <input id="gr-code" className="input gr-code" value={created ?? code} disabled={!!created} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-invalid={!!codeError} />
                        <button className="btn btn--sm" type="button" disabled={!!created} onClick={() => setCode(genCode())}>
                          {tx('توليد', 'Generate')}
                        </button>
                      </div>
                    </Field>
                    <div className="gr-form-2">
                      <Field label={tx('نسبة الخصم ٪', 'Percent off')} error={pctError} htmlFor="gr-pct">
                        <input id="gr-pct" className="input num" type="number" min={1} max={90} value={pct} disabled={!!created} onChange={(e) => setPct(Number(e.target.value))} />
                      </Field>
                      <Field label={tx('صالح لمدة (يوم)', 'Valid for (days)')} htmlFor="gr-days">
                        <input id="gr-days" className="input num" type="number" min={1} max={90} value={days} disabled={!!created} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} />
                      </Field>
                    </div>
                  </div>
                  {created ? (
                    <Badge tone="ok">{tx(`الكود ${created} اتعمل وظاهر في الخصومات`, `${created} created and listed in Discounts`)}</Badge>
                  ) : (
                    <div>
                      <button className="btn btn--sm" type="button" onClick={createCode} disabled={!!codeError || !!pctError}>
                        {tx('إنشاء الكود', 'Create code')}
                      </button>
                    </div>
                  )}
                  {missingCodeVar && <span className="field__error">{tx('الرسالة مافيهاش {code}، فالكود مش هيظهر للعميل.', 'The message has no {code}, so customers won’t see the code.')}</span>}
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="field__label" style={{ marginBottom: 6 }}>
            {first ? tx(`معاينة لـ ${pick(first.name)}`, `Preview for ${pick(first.name)}`) : tx('معاينة', 'Preview')}
          </div>
          {first ? (
            <div className="gr-bubble" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
              {preview || ' '}
            </div>
          ) : (
            <div className="gr-note">{tx('مفيش حد في الشريحة دي ينفع يستلم الرسالة.', 'Nobody in this audience can receive this message.')}</div>
          )}
        </div>

        <Note>
          {channel === 'whatsapp'
            ? tx(
                'الإرسال الجماعي على واتساب محتاج ربط WhatsApp Business API، وده غير متصل في النسخة التجريبية. الزرار بيفتح محادثة أول مستلم فقط؛ لباقي القائمة يمكن تصديرها واستيرادها في أداة البث.',
                'Bulk WhatsApp sending needs the WhatsApp Business API, which is not connected in this demo. The button opens a chat with the first recipient only; export the list to import into a broadcast tool.',
              )
            : tx(
                'الإرسال الجماعي بالبريد محتاج ربط مزوّد بريد (غير متصل في النسخة التجريبية). الزرار بيفتح رسالة لأول مستلم فقط.',
                'Bulk email needs an email provider connection (not connected in this demo). The button opens a draft to the first recipient only.',
              )}
        </Note>
      </div>
    </Drawer>
  )
}
