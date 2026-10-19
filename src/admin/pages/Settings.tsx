import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Boxes, CreditCard, History, Languages, Plug, Receipt, ShieldAlert, Store, Users } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import type { Settings as SettingsT } from '../../data/types'
import { Avatar, Badge, DemoNote, Field, PageHeader, Pane, Switch, useAdmin } from '../ui'
import { Note } from '../parts/growth'
import { IntegrationsPane } from '../parts/integrations'
import { api } from '../../lib/api'
import { loadAdmin } from '../../lib/sync'
import { ROLE_LABEL } from '../../lib/permissions'
import type { Permission } from '../../lib/permissions'
import { AuditPane, PermissionMatrix, StaffPane } from '../parts/staff'

type Section = 'store' | 'lang' | 'tax' | 'pay' | 'integrations' | 'inv' | 'staff' | 'audit' | 'notify' | 'danger'


const LRI = String.fromCharCode(0x2066)
const PDI = String.fromCharCode(0x2069)
const NOTIFY_KEY = 'nuri-admin-notify'
const NOTIFY_DEFAULT = { newOrder: true, lowStock: true, expiry: true, review: true, abandoned: false, dailySummary: true }
type Notify = typeof NOTIFY_DEFAULT

const sameSettings = (a: SettingsT, b: SettingsT) => JSON.stringify(a) === JSON.stringify(b)

export default function Settings() {
  const { tx, pick, num, money, relTime } = useI18n()
  const { toast, staff: me, me: account, online, can } = useAdmin()
  const settings = useStore((s) => s.settings)
  const staff = useStore((s) => s.staff)
  const updateSettings = useStore((s) => s.updateSettings)
  const resetDemo = useStore((s) => s.resetDemo)
  const log = useStore((s) => s.log)

  const [section, setSection] = useState<Section>('store')
  const [draft, setDraft] = useState<SettingsT>(settings)
  const [touched, setTouched] = useState(false)
  const [confirmReset, setConfirmReset] = useState('')
  const [notify, setNotify] = useState<Notify>(() => {
    try {
      return { ...NOTIFY_DEFAULT, ...JSON.parse(localStorage.getItem(NOTIFY_KEY) ?? '{}') }
    } catch {
      return NOTIFY_DEFAULT
    }
  })

  // Pick up outside changes (e.g. COD toggled on the Shipping page) when not editing
  useEffect(() => {
    setDraft((d) => (touched ? d : settings))
  }, [settings, touched])

  const dirty = !sameSettings(draft, settings)
  const set = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => {
    setTouched(true)
    setDraft((d) => ({ ...d, [k]: v }))
  }

  /* Validation */
  const errors: Partial<Record<keyof SettingsT | 'storeNameAr' | 'storeNameEn', string>> = {}
  if (!draft.storeName.ar.trim()) errors.storeNameAr = tx('الاسم مطلوب', 'Required')
  if (!draft.storeName.en.trim()) errors.storeNameEn = tx('الاسم مطلوب', 'Required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = tx('بريد غير صحيح', 'Not a valid email')
  if (draft.phone.replace(/\D/g, '').length < 8) errors.phone = tx('رقم غير مكتمل', 'Incomplete number')
  if (draft.whatsapp.replace(/\D/g, '').length < 8) errors.whatsapp = tx('رقم غير مكتمل', 'Incomplete number')
  if (!(draft.vatRate >= 0 && draft.vatRate <= 100)) errors.vatRate = tx('بين 0 و100', 'Between 0 and 100')
  if (!(draft.lowStockDefault >= 0)) errors.lowStockDefault = tx('صفر أو أكتر', '0 or more')
  if (!(draft.expiryWarnDays >= 1)) errors.expiryWarnDays = tx('يوم واحد أو أكتر', '1 day or more')
  if (draft.announcement.ar.length > 120) errors.announcement = tx('أقصى طول 120 حرف', '120 characters max')
  if (draft.announcement.en.length > 120) errors.announcement = tx('أقصى طول 120 حرف', '120 characters max')
  const valid = Object.keys(errors).length === 0

  const save = () => {
    if (!valid) {
      toast(tx('فيه حقول محتاجة تتصلّح', 'Some fields need fixing'))
      return
    }
    updateSettings({ ...draft, storeName: { ar: draft.storeName.ar.trim(), en: draft.storeName.en.trim() }, email: draft.email.trim() })
    log(me, { ar: 'حدّث إعدادات المتجر', en: 'Updated store settings' }, '/admin/settings')
    toast(tx('تم حفظ الإعدادات', 'Settings saved'))
    setTouched(false)
  }
  const discard = () => {
    setDraft(settings)
    setTouched(false)
  }

  const setN = (k: keyof Notify, v: boolean) => {
    const next = { ...notify, [k]: v }
    setNotify(next)
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(next))
    } catch {
      /* storage blocked */
    }
  }

  const allNav: { id: Section; ar: string; en: string; icon: ComponentType<LucideProps>; danger?: boolean; perm?: Permission; online?: boolean }[] = [
    { id: 'store', ar: 'بيانات المتجر', en: 'Store details', icon: Store, perm: 'settings.edit' },
    { id: 'lang', ar: 'اللغة والعملة', en: 'Languages and currency', icon: Languages, perm: 'settings.edit' },
    { id: 'tax', ar: 'الضرايب', en: 'Taxes', icon: Receipt, perm: 'settings.edit' },
    { id: 'pay', ar: 'طرق الدفع', en: 'Payments', icon: CreditCard, perm: 'settings.edit' },
    { id: 'integrations', ar: 'الربط مع الخدمات', en: 'Integrations', icon: Plug, perm: 'integrations.use' },
    { id: 'inv', ar: 'قواعد المخزون', en: 'Inventory rules', icon: Boxes, perm: 'settings.edit' },
    { id: 'staff', ar: 'الفريق والصلاحيات', en: 'Staff and permissions', icon: Users, perm: 'staff.manage' },
    { id: 'audit', ar: 'سجل التعديلات', en: 'Audit log', icon: History, perm: 'audit.view', online: true },
    { id: 'notify', ar: 'التنبيهات', en: 'Notifications', icon: Bell },
    { id: 'danger', ar: 'منطقة الخطر', en: 'Danger zone', icon: ShieldAlert, danger: true, perm: 'data.reset' },
  ]
  const nav = allNav.filter((n) => (!n.perm || can(n.perm)) && (!n.online || online))
  // A role without the store sections lands on the first section it can use.
  const current: Section = nav.some((n) => n.id === section) ? section : (nav[0]?.id ?? 'notify')

  const vatPart = (price: number) => (draft.taxIncluded ? price - price / (1 + draft.vatRate / 100) : (price * draft.vatRate) / 100)

  return (
    <>
      <PageHeader
        title={tx('الإعدادات', 'Settings')}
        description={
          <>
            {tx('بيانات المتجر واللغة والضرايب والدفع والفريق. ', 'Store details, language, tax, payments and staff. ')}
            <DemoNote />
          </>
        }
      />

      <div className="gr-settings">
        <nav className="gr-subnav" aria-label={tx('أقسام الإعدادات', 'Settings sections')}>
          {nav.map((n) => (
            <button key={n.id} type="button" aria-current={current === n.id} className={n.danger ? 'gr-subnav__danger' : undefined} onClick={() => setSection(n.id)}>
              <n.icon size={16} aria-hidden />
              {tx(n.ar, n.en)}
            </button>
          ))}
        </nav>

        <div className="stack" style={{ minWidth: 0 }}>
          {current === 'store' && (
            <>
              <Pane title={tx('بيانات المتجر', 'Store details')} description={tx('بتظهر للعملاء في المتجر والرسايل والفواتير', 'Shown to customers in the store, messages and invoices')}>
                <div className="gr-form">
                  <div className="gr-form-2">
                    <Field label={tx('اسم المتجر بالعربي', 'Store name in Arabic')} error={errors.storeNameAr} htmlFor="st-nar">
                      <input id="st-nar" className="input" dir="rtl" lang="ar" value={draft.storeName.ar} onChange={(e) => set('storeName', { ...draft.storeName, ar: e.target.value })} aria-invalid={!!errors.storeNameAr} />
                    </Field>
                    <Field label={tx('اسم المتجر بالإنجليزي', 'Store name in English')} error={errors.storeNameEn} htmlFor="st-nen">
                      <input id="st-nen" className="input" dir="ltr" lang="en" value={draft.storeName.en} onChange={(e) => set('storeName', { ...draft.storeName, en: e.target.value })} aria-invalid={!!errors.storeNameEn} />
                    </Field>
                  </div>
                  <Field label={tx('البريد الإلكتروني', 'Email')} error={errors.email} htmlFor="st-email">
                    <input id="st-email" className="input" type="email" dir="ltr" value={draft.email} onChange={(e) => set('email', e.target.value)} aria-invalid={!!errors.email} />
                  </Field>
                  <div className="gr-form-2">
                    <Field label={tx('التليفون', 'Phone')} error={errors.phone} htmlFor="st-phone">
                      <input id="st-phone" className="input num" type="tel" dir="ltr" value={draft.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} />
                    </Field>
                    <Field label={tx('واتساب', 'WhatsApp')} error={errors.whatsapp} hint={tx('الرقم اللي بيستقبل التأكيدات وأسئلة العملاء', 'Receives confirmations and customer questions')} htmlFor="st-wa">
                      <input id="st-wa" className="input num" type="tel" dir="ltr" value={draft.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} aria-invalid={!!errors.whatsapp} />
                    </Field>
                  </div>
                </div>
              </Pane>
              <Pane title={tx('شريط الإعلان', 'Announcement bar')} description={tx('سطر في الشريط فوق المتجر. الأقسام والقائمة والفوتر والصفحات من واجهة المتجر.', 'One line in the bar above the store. Sections, menu, footer and pages are on the storefront page.')}>
                <div className="gr-form">
                  <Field label={tx('بالعربي', 'Arabic')} hint={`${LRI}${num(draft.announcement.ar.length)} / 120${PDI}`} error={draft.announcement.ar.length > 120 ? errors.announcement : undefined} htmlFor="st-aar">
                    <input id="st-aar" className="input" dir="rtl" lang="ar" value={draft.announcement.ar} onChange={(e) => set('announcement', { ...draft.announcement, ar: e.target.value })} />
                  </Field>
                  <Field label={tx('بالإنجليزي', 'English')} hint={`${LRI}${num(draft.announcement.en.length)} / 120${PDI}`} error={draft.announcement.en.length > 120 ? errors.announcement : undefined} htmlFor="st-aen">
                    <input id="st-aen" className="input" dir="ltr" lang="en" value={draft.announcement.en} onChange={(e) => set('announcement', { ...draft.announcement, en: e.target.value })} />
                  </Field>
                  <div>
                    <div className="field__label" style={{ marginBottom: 6 }}>
                      {tx('معاينة', 'Preview')}
                    </div>
                    <div className="stack" style={{ gap: 6 }}>
                      <div className="gr-announce" dir="rtl" lang="ar">
                        {draft.announcement.ar || tx('(فاضي، الشريط مش هيظهر)', '(empty, the bar is hidden)')}
                      </div>
                      <div className="gr-announce" dir="ltr" lang="en">
                        {draft.announcement.en || tx('(فاضي، الشريط مش هيظهر)', '(empty, the bar is hidden)')}
                      </div>
                    </div>
                  </div>
                </div>
              </Pane>
            </>
          )}

          {current === 'lang' && (
            <Pane title={tx('اللغة والعملة', 'Languages and currency')}>
              <div className="gr-form">
                <Field label={tx('لغة المتجر الافتراضية', 'Default store language')} hint={tx('أول ما الزائر يفتح المتجر. يقدر يغيّرها من الزرار في الأعلى.', 'What a first-time visitor sees. They can switch from the top bar.')} htmlFor="st-lang">
                  <select id="st-lang" className="select" value={draft.defaultLang} onChange={(e) => set('defaultLang', e.target.value as 'ar' | 'en')}>
                    <option value="ar">العربية (من اليمين لليسار)</option>
                    <option value="en">English (left to right)</option>
                  </select>
                </Field>
                <Field label={tx('العملة', 'Currency')} hint={tx('العملة الوحيدة المدعومة حاليًا.', 'The only supported currency for now.')} htmlFor="st-cur">
                  <input id="st-cur" className="input" value={tx('جنيه مصري (ج.م)', 'Egyptian pound (EGP)')} disabled />
                </Field>
                <Note>
                  {tx(
                    `الأرقام بتظهر بالأرقام الغربية (0123) في اللغتين، زي أغلب المتاجر المصرية، مع أسماء الشهور والعملة بالعربي. مثال: ${money(1250)}.`,
                    `Numbers use Western digits (0123) in both languages, like most Egyptian stores, with Arabic month names and currency. Example: ${money(1250)}.`,
                  )}
                </Note>
              </div>
            </Pane>
          )}

          {current === 'tax' && (
            <Pane title={tx('الضرايب', 'Taxes')} description={tx('ضريبة القيمة المضافة في مصر 14٪', 'Egyptian VAT is 14%')}>
              <div className="gr-form">
                <Field label={tx('نسبة ضريبة القيمة المضافة ٪', 'VAT rate (%)')} error={errors.vatRate} htmlFor="st-vat">
                  <input id="st-vat" className="input num" type="number" min={0} max={100} step={0.5} value={draft.vatRate} onChange={(e) => set('vatRate', Number(e.target.value))} aria-invalid={!!errors.vatRate} style={{ maxWidth: 160 }} />
                </Field>
                <div className="gr-toggle-row">
                  <div>
                    <div className="small strong">{tx('الأسعار شاملة الضريبة', 'Prices include tax')}</div>
                    <div className="tiny faint">{tx('العميل بيشوف سعر نهائي من غير مفاجآت عند الدفع.', 'Customers see a final price with no checkout surprises.')}</div>
                  </div>
                  <Switch checked={draft.taxIncluded} onChange={(v) => set('taxIncluded', v)} label={tx('الأسعار شاملة الضريبة', 'Prices include tax')} />
                </div>
                <div className="gr-summary small">
                  {draft.taxIncluded
                    ? tx(`منتج بسعر ${money(1000)} فيه ضريبة ${money(vatPart(1000))}، والعميل بيدفع ${money(1000)}.`, `A ${money(1000)} product includes ${money(vatPart(1000))} VAT; the customer pays ${money(1000)}.`)
                    : tx(`منتج بسعر ${money(1000)} بيتضاف عليه ${money(vatPart(1000))} ضريبة، والعميل بيدفع ${money(1000 + vatPart(1000))}.`, `A ${money(1000)} product gets ${money(vatPart(1000))} VAT added; the customer pays ${money(1000 + vatPart(1000))}.`)}
                </div>
                <Note>{tx('الفاتورة الإلكترونية لمصلحة الضرايب (ETA) محتاجة ربط منفصل وغير متصلة في النسخة التجريبية.', 'Egyptian Tax Authority e-invoicing needs a separate integration and is not connected in this demo.')}</Note>
              </div>
            </Pane>
          )}

          {current === 'pay' && (
            <Pane title={tx('طرق الدفع', 'Payments')} flush>
              <ul className="list">
                <li>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small strong">{tx('الدفع عند الاستلام', 'Cash on delivery')}</div>
                    <div className="tiny faint">
                      {tx(`حد أقصى ${money(settings.codMax)}. `, `Up to ${money(settings.codMax)}. `)}
                      <Link to="/admin/shipping">{tx('الحد ورسوم التحصيل في الشحن', 'Limit and fees in Shipping')}</Link>
                    </div>
                  </div>
                  <Switch checked={draft.codEnabled} onChange={(v) => set('codEnabled', v)} label={tx('الدفع عند الاستلام', 'Cash on delivery')} />
                </li>
                <li>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small strong">{tx('تأكيد طلبات الاستلام على واتساب', 'Confirm COD orders on WhatsApp')}</div>
                    <div className="tiny faint">{tx('رسالة تأكيد قبل التجهيز بتقلّل الطلبات اللي بترجع.', 'A confirmation message before packing cuts returned orders.')}</div>
                  </div>
                  <Switch checked={draft.autoConfirmWhatsapp} onChange={(v) => set('autoConfirmWhatsapp', v)} label={tx('تأكيد طلبات الاستلام على واتساب', 'Confirm COD orders on WhatsApp')} />
                </li>
                {[
                  { ar: 'بطاقات بنكية (Visa، Mastercard، ميزة)', en: 'Cards (Visa, Mastercard, Meeza)', via: tx('عن طريق Paymob أو Fawry', 'via Paymob or Fawry') },
                  { ar: 'محافظ الموبايل', en: 'Mobile wallets', via: tx('فودافون كاش، اتصالات كاش، أورانج كاش', 'Vodafone Cash, Etisalat Cash, Orange Cash') },
                  { ar: 'إنستاباي', en: 'InstaPay', via: tx('تحويل لحظي مع مراجعة يدوية', 'Instant transfer with manual review') },
                ].map((m) => (
                  <li key={m.en}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="small strong">{tx(m.ar, m.en)}</div>
                      <div className="tiny faint">{m.via}</div>
                    </div>
                    <Badge tone="hollow">{tx('غير متصل (تجريبي)', 'Not connected (demo)')}</Badge>
                  </li>
                ))}
              </ul>
              <div className="pane__foot">
                <Note>{tx('مفيش بوابة دفع متصلة؛ الطلبات المدفوعة في البيانات التجريبية متسجّلة كمدفوعة من غير تحصيل فعلي.', 'No payment gateway is connected; paid orders in the demo data are recorded as paid with no real capture.')}</Note>
              </div>
            </Pane>
          )}

          {current === 'integrations' && <IntegrationsPane />}

          {current === 'inv' && (
            <Pane title={tx('قواعد المخزون', 'Inventory rules')}>
              <div className="gr-form">
                <Field label={tx('حد المخزون المنخفض الافتراضي', 'Default low-stock level')} error={errors.lowStockDefault} hint={tx('للمنتجات الجديدة. كل منتج له حده الخاص في صفحته.', 'For new products. Each product has its own level on its page.')} htmlFor="st-low">
                  <div className="input-group" style={{ maxWidth: 220 }}>
                    <span className="addon">{tx('قطعة', 'units')}</span>
                    <input id="st-low" className="input num" type="number" min={0} value={draft.lowStockDefault} onChange={(e) => set('lowStockDefault', Number(e.target.value))} aria-invalid={!!errors.lowStockDefault} />
                  </div>
                </Field>
                <Field label={tx('التنبيه قبل انتهاء الصلاحية بـ', 'Warn before expiry')} error={errors.expiryWarnDays} hint={tx('التشغيلات اللي هتنتهي خلال المدة دي بتظهر في المخزون والصلاحية.', 'Batches expiring within this window show in Stock and expiry.')} htmlFor="st-exp">
                  <div className="input-group" style={{ maxWidth: 220 }}>
                    <span className="addon">{tx('يوم', 'days')}</span>
                    <input id="st-exp" className="input num" type="number" min={1} value={draft.expiryWarnDays} onChange={(e) => set('expiryWarnDays', Number(e.target.value))} aria-invalid={!!errors.expiryWarnDays} />
                  </div>
                </Field>
                <Note>{tx('الطلبات بتسحب من التشغيلة الأقرب انتهاءً أولًا (FEFO) تلقائيًا.', 'Orders draw from the batch that expires first (FEFO) automatically.')}</Note>
              </div>
            </Pane>
          )}

          {current === 'staff' && (
            <>
              {online ? (
                <StaffPane />
              ) : (
                <Pane title={tx('الفريق', 'Staff')} flush>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>{tx('الاسم', 'Name')}</th>
                          <th>{tx('البريد', 'Email')}</th>
                          <th>{tx('الدور', 'Role')}</th>
                          <th>{tx('آخر نشاط', 'Last active')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((s) => (
                          <tr key={s.id}>
                            <td>
                              <span className="row" style={{ gap: 10 }}>
                                <Avatar name={s.name} />
                                <span className="strong">{s.name}</span>
                                {s.id === account.id && <Badge plain>{tx('الحساب الحالي', 'You')}</Badge>}
                              </span>
                            </td>
                            <td className="small muted gr-ltr">{s.email}</td>
                            <td>
                              <Badge tone={s.role === 'owner' ? 'info' : undefined} plain>
                                {pick(ROLE_LABEL[s.role])}
                              </Badge>
                            </td>
                            <td className="small muted">{relTime(Math.min(Date.now(), new Date(s.lastActive).getTime()))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pane__foot">
                    <span>{tx('إضافة أعضاء وتسجيل الدخول محتاجين حسابات حقيقية، ودي غير متاحة في النسخة التجريبية.', 'Inviting staff and sign-in need real accounts, which this demo doesn’t have.')}</span>
                  </div>
                </Pane>
              )}
              <PermissionMatrix />
            </>
          )}

          {current === 'audit' && <AuditPane />}

          {current === 'notify' && (
            <Pane title={tx('التنبيهات', 'Notifications')} description={tx('بتتحفظ في المتصفح ده فقط', 'Saved in this browser only')}>
              {(
                [
                  ['newOrder', tx('طلب جديد', 'New order'), tx('صوت وتنبيه في لوحة التحكم', 'Sound and badge in the admin')],
                  ['lowStock', tx('مخزون منخفض', 'Low stock'), tx('لما منتج يوصل لحده', 'When a product hits its level')],
                  ['expiry', tx('صلاحية قرّبت تنتهي', 'Expiry approaching'), tx(`قبلها بـ ${num(settings.expiryWarnDays)} يوم`, `${num(settings.expiryWarnDays)} days ahead`)],
                  ['review', tx('تقييم جديد محتاج مراجعة', 'New review to moderate'), tx('خصوصًا 3 نجوم أو أقل', 'Especially 3 stars or fewer')],
                  ['abandoned', tx('سلة متروكة بقيمة عالية', 'High-value abandoned cart'), tx('فوق 2000 ج.م', 'Over EGP 2,000')],
                  ['dailySummary', tx('ملخص يومي بالبريد', 'Daily email summary'), tx('مبيعات امبارح والمطلوب النهارده', 'Yesterday’s sales and today’s to-dos')],
                ] as [keyof Notify, string, string][]
              ).map(([k, label, hint]) => (
                <div key={k} className="gr-toggle-row">
                  <div>
                    <div className="small strong">{label}</div>
                    <div className="tiny faint">{hint}</div>
                  </div>
                  <Switch checked={notify[k]} onChange={(v) => setN(k, v)} label={label} />
                </div>
              ))}
              <div style={{ marginTop: 12 }}>
                <Note>{tx('إرسال التنبيهات بالبريد أو واتساب محتاج ربط خدمة رسائل، وده غير متصل.', 'Sending alerts by email or WhatsApp needs a messaging service, which is not connected.')}</Note>
              </div>
            </Pane>
          )}

          {current === 'danger' && (
            <Pane title={tx('منطقة الخطر', 'Danger zone')}>
              <div className="stack" style={{ gap: 12 }}>
                <div>
                  <div className="strong">{online ? tx('مسح كل بيانات المتجر', 'Erase all store data') : tx('إعادة ضبط البيانات التجريبية', 'Reset demo data')}</div>
                  <p className="small muted" style={{ marginTop: 4 }}>
                    {online
                      ? tx('بيمسح كل الطلبات الحقيقية والعملاء والتقييمات وأكواد الخصم، وبيرجّع المنتجات والمخزون والإعدادات لبداية المتجر. حسابات الفريق بتفضل. مفيش رجوع.', 'Deletes every real order, customer, review and discount code, and returns products, stock and settings to the store’s starting point. Staff sign-ins stay. This can’t be undone.')
                      : tx('بيرجّع المنتجات والطلبات والعملاء والخصومات والإعدادات لحالتها الأصلية، وبيمسح أي طلبات اتعملت من المتجر. مفيش رجوع.', 'Restores products, orders, customers, discounts and settings to their original state and removes any orders placed in the store. This can’t be undone.')}
                  </p>
                </div>
                <Field label={tx('للتأكيد، كتابة RESET', 'To confirm, type RESET')} htmlFor="st-reset">
                  <input id="st-reset" className="input gr-code" dir="ltr" value={confirmReset} onChange={(e) => setConfirmReset(e.target.value)} style={{ maxWidth: 220 }} autoComplete="off" />
                </Field>
                <div>
                  <button
                    className="btn btn--danger"
                    disabled={confirmReset.trim().toUpperCase() !== 'RESET'}
                    onClick={async () => {
                      if (online) {
                        // Reset on the server, then reload: never replay thousands of local writes.
                        try {
                          await api('/api/admin/reset', { method: 'POST', admin: true })
                          await loadAdmin()
                        } catch {
                          toast(tx('إعادة الضبط على السيرفر ما نجحتش', 'Server reset failed'))
                          return
                        }
                      } else resetDemo()
                      setConfirmReset('')
                      setTouched(false)
                      toast(online ? tx('اتمسحت بيانات المتجر', 'Store data erased') : tx('تمت إعادة ضبط البيانات التجريبية', 'Demo data reset'))
                    }}
                  >
                    {online ? tx('مسح كل البيانات', 'Erase all data') : tx('إعادة ضبط البيانات', 'Reset demo data')}
                  </button>
                </div>
              </div>
            </Pane>
          )}

          {dirty && (
            <div className="gr-savebar" role="region" aria-label={tx('تغييرات غير محفوظة', 'Unsaved changes')}>
              <span className="small">{valid ? tx('فيه تغييرات مش محفوظة', 'Unsaved changes') : tx('فيه حقول محتاجة تتصلّح', 'Some fields need fixing')}</span>
              <div className="row">
                <button className="btn btn--ghost btn--sm" onClick={discard}>
                  {tx('تجاهل', 'Discard')}
                </button>
                <button className="btn btn--live btn--sm" onClick={save} disabled={!valid}>
                  {tx('حفظ', 'Save')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
