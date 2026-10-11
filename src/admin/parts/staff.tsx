import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, KeyRound, Minus, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import type { Staff } from '../../data/types'
import { api, ApiError } from '../../lib/api'
import { PERMISSION_LABEL, PERMISSIONS, ROLE_LABEL, ROLES, roleCan } from '../../lib/permissions'
import type { Role } from '../../lib/permissions'
import { applyServerDoc, removeServerDoc } from '../../lib/sync'
import { Avatar, Badge, Drawer, Empty, Field, Pane, useAdmin } from '../ui'

/*
  Settings → Staff and permissions (with the API): real sign-in accounts.
  Passwords are never shown except once, right after the server generates
  one. Role rules (e.g. the last owner can't be demoted) are enforced by the
  server; this screen shows its bilingual answer.
*/

type Row = Staff & { login: boolean; disabled: boolean }
type Secret = { name: string; email: string; password: string }

const neverActive = (iso: string) => !iso || new Date(iso).getTime() <= 0

export function StaffPane() {
  const { tx, pick, relTime } = useI18n()
  const { me, toast } = useAdmin()
  const [rows, setRows] = useState<Row[]>()
  const [loadErr, setLoadErr] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [secret, setSecret] = useState<Secret>()
  const [confirmDel, setConfirmDel] = useState<string>()
  const [busy, setBusy] = useState<string>()

  const errText = useCallback((e: unknown) => (e instanceof ApiError ? pick(e.bi) : tx('حصلت مشكلة. محاولة تانية؟', 'Something went wrong. Try again?')), [pick, tx])

  const load = useCallback(() => {
    setLoadErr(undefined)
    api<{ staff: Row[] }>('/api/admin/staff', { admin: true })
      .then((r) => setRows(r.staff))
      .catch((e) => setLoadErr(errText(e)))
  }, [errText])
  useEffect(load, [load])

  const keep = (row: Row, rev?: number) => {
    setRows((rs) => (rs?.some((x) => x.id === row.id) ? rs.map((x) => (x.id === row.id ? row : x)) : [...(rs ?? []), row]))
    if (rev !== undefined) {
      const { login: _login, disabled: _disabled, ...doc } = row
      applyServerDoc('staff', doc, rev)
    }
  }

  const update = async (row: Row, patch: Partial<Pick<Staff, 'name' | 'role'>> & { disabled?: boolean }, done: string) => {
    setBusy(row.id)
    try {
      const r = await api<{ staff: Row; rev: number }>(`/api/admin/staff/${row.id}`, { method: 'PUT', body: patch, admin: true })
      keep(r.staff, r.rev)
      toast(done)
    } catch (e) {
      toast(errText(e))
    } finally {
      setBusy(undefined)
    }
  }

  const resetPassword = async (row: Row) => {
    setBusy(row.id)
    try {
      const r = await api<{ staff: Row; password?: string }>(`/api/admin/staff/${row.id}/password`, { body: {}, admin: true })
      keep(r.staff)
      if (r.password) setSecret({ name: row.name, email: r.staff.email, password: r.password })
    } catch (e) {
      toast(errText(e))
    } finally {
      setBusy(undefined)
    }
  }

  const remove = async (row: Row) => {
    setBusy(row.id)
    try {
      await api(`/api/admin/staff/${row.id}`, { method: 'DELETE', admin: true })
      setRows((rs) => rs?.filter((x) => x.id !== row.id))
      removeServerDoc('staff', row.id)
      toast(tx(`اتشال حساب ${row.name}`, `Removed ${row.name}`))
    } catch (e) {
      toast(errText(e))
    } finally {
      setBusy(undefined)
      setConfirmDel(undefined)
    }
  }

  const sorted = useMemo(() => [...(rows ?? [])].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name)), [rows])

  return (
    <>
      <Pane
        title={tx('الفريق', 'Staff')}
        description={tx('كل شخص بيدخل بحسابه، والدور بيحدد هو يقدر يعمل إيه', 'Everyone signs in with their own account; the role decides what they can do')}
        actions={
          <button className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />
            {tx('إضافة عضو', 'Add staff')}
          </button>
        }
        flush
      >
        {loadErr ? (
          <Empty title={tx('الفريق ما اتحمّلش', 'Couldn’t load staff')} action={<button className="btn btn--sm" onClick={load}>{tx('إعادة المحاولة', 'Retry')}</button>}>
            {loadErr}
          </Empty>
        ) : !rows ? (
          <p className="small muted" style={{ padding: 16 }} aria-busy="true">
            {tx('بيتحمّل…', 'Loading…')}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{tx('الاسم', 'Name')}</th>
                  <th>{tx('البريد', 'Email')}</th>
                  <th>{tx('الدور', 'Role')}</th>
                  <th>{tx('الحالة', 'Status')}</th>
                  <th>{tx('آخر نشاط', 'Last active')}</th>
                  <th>
                    <span className="sr-only">{tx('إجراءات', 'Actions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const self = s.id === me.id
                  const working = busy === s.id
                  return (
                    <tr key={s.id} aria-busy={working || undefined}>
                      <td>
                        <span className="row" style={{ gap: 10 }}>
                          <Avatar name={s.name} />
                          <span className="strong">{s.name}</span>
                          {self && <Badge plain>{tx('الحساب الحالي', 'You')}</Badge>}
                        </span>
                      </td>
                      <td className="small muted gr-ltr">{s.email}</td>
                      <td>
                        <select
                          className="select"
                          style={{ height: 30, minWidth: 130 }}
                          value={s.role}
                          disabled={working}
                          onChange={(e) => {
                            const role = e.target.value as Role
                            void update(s, { role }, tx(`${s.name} بقى دوره: ${ROLE_LABEL[role].ar}`, `${s.name} is now ${ROLE_LABEL[role].en}`))
                          }}
                          aria-label={tx(`دور ${s.name}`, `Role for ${s.name}`)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {pick(ROLE_LABEL[r])}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {!s.login ? (
                          <Badge tone="hollow">{tx('من غير دخول', 'No sign-in')}</Badge>
                        ) : s.disabled ? (
                          <Badge tone="bad">{tx('متوقف', 'Disabled')}</Badge>
                        ) : (
                          <Badge tone="ok">{tx('نشط', 'Active')}</Badge>
                        )}
                      </td>
                      <td className="small muted">{neverActive(s.lastActive) ? tx('لسه ما دخلش', 'Never') : relTime(Math.min(Date.now(), new Date(s.lastActive).getTime()))}</td>
                      <td>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4, flexWrap: 'nowrap' }}>
                          <button className="btn btn--ghost btn--sm" disabled={working} onClick={() => void resetPassword(s)}>
                            <KeyRound size={14} aria-hidden />
                            {s.login ? tx('كلمة سر جديدة', 'Reset password') : tx('إنشاء دخول', 'Create sign-in')}
                          </button>
                          {s.login && (
                            <button
                              className="btn btn--ghost btn--sm"
                              disabled={working}
                              onClick={() => void update(s, { disabled: !s.disabled }, s.disabled ? tx(`اتفعّل حساب ${s.name}`, `${s.name} can sign in again`) : tx(`اتوقف حساب ${s.name}`, `${s.name} is signed out and disabled`))}
                            >
                              {s.disabled ? tx('تفعيل', 'Enable') : tx('إيقاف', 'Disable')}
                            </button>
                          )}
                          {!self &&
                            (confirmDel === s.id ? (
                              <button className="btn btn--danger btn--sm" disabled={working} onClick={() => void remove(s)}>
                                {tx('تأكيد الحذف', 'Confirm delete')}
                              </button>
                            ) : (
                              <button className="btn btn--ghost btn--danger btn--sm btn--icon" disabled={working} onClick={() => setConfirmDel(s.id)} aria-label={tx(`حذف ${s.name}`, `Delete ${s.name}`)} title={tx('حذف', 'Delete')}>
                                <Trash2 size={14} />
                              </button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pane__foot">
          <span>{tx('إيقاف الحساب أو تغيير كلمة السر بيخرّج الشخص من كل الأجهزة. لازم يفضل مالك واحد على الأقل.', 'Disabling an account or resetting its password signs that person out everywhere. At least one owner must remain.')}</span>
        </div>
      </Pane>

      <AddStaffDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(row, rev, password) => {
          keep(row, rev)
          setAdding(false)
          if (password) setSecret({ name: row.name, email: row.email, password })
          else toast(tx(`اتضاف ${row.name}`, `Added ${row.name}`))
        }}
      />
      <SecretDrawer secret={secret} onClose={() => setSecret(undefined)} />
    </>
  )
}

function AddStaffDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (row: Row, rev: number, password?: string) => void }) {
  const { tx, pick } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('support')
  const [mode, setMode] = useState<'generate' | 'set'>('generate')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'name' | 'email' | 'role' | 'password' | 'form', string>>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setRole('support')
    setMode('generate')
    setPassword('')
    setErrors({})
  }, [open])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = tx('الاسم مطلوب', 'Required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = tx('بريد غير صحيح', 'Not a valid email')
    if (mode === 'set' && password.length < 10) errs.password = tx('10 حروف على الأقل', 'At least 10 characters')
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const r = await api<{ staff: Row; rev: number; password?: string }>('/api/admin/staff', {
        body: { name: name.trim(), email: email.trim(), role, ...(mode === 'set' ? { password } : {}) },
        admin: true,
      })
      onCreated(r.staff, r.rev, r.password)
    } catch (err) {
      const field = err instanceof ApiError && typeof err.detail.field === 'string' ? (err.detail.field as keyof typeof errors) : 'form'
      setErrors({ [field]: err instanceof ApiError ? pick(err.bi) : tx('الإضافة ما نجحتش', 'Couldn’t add this person') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={tx('إضافة عضو للفريق', 'Add staff member')}
      width={520}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            {tx('إلغاء', 'Cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => void submit()} disabled={busy} aria-busy={busy || undefined}>
            {tx('إضافة', 'Add')}
          </button>
        </>
      }
    >
      <form className="gr-form" onSubmit={submit} noValidate>
        <Field label={tx('الاسم', 'Name')} error={errors.name} htmlFor="st-new-name">
          <input id="st-new-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} autoComplete="off" />
        </Field>
        <Field label={tx('البريد الإلكتروني', 'Email')} hint={tx('ده اللي هيدخل بيه', 'Used to sign in')} error={errors.email} htmlFor="st-new-email">
          <input id="st-new-email" className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} autoComplete="off" />
        </Field>
        <Field label={tx('الدور', 'Role')} error={errors.role} htmlFor="st-new-role">
          <select id="st-new-role" className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {pick(ROLE_LABEL[r])}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="adm-readonly stack" style={{ gap: 8 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>
            {tx('كلمة السر', 'Password')}
          </legend>
          <label className="row small" style={{ gap: 8 }}>
            <input type="radio" name="st-pw-mode" checked={mode === 'generate'} onChange={() => setMode('generate')} />
            {tx('توليد كلمة سر قوية (بتظهر مرة واحدة بس)', 'Generate a strong password (shown once)')}
          </label>
          <label className="row small" style={{ gap: 8 }}>
            <input type="radio" name="st-pw-mode" checked={mode === 'set'} onChange={() => setMode('set')} />
            {tx('تحديد كلمة سر', 'Set a password')}
          </label>
          {mode === 'set' && (
            <Field label={tx('كلمة السر الجديدة', 'New password')} hint={tx('10 حروف على الأقل', 'At least 10 characters')} error={errors.password} htmlFor="st-new-pw">
              <input id="st-new-pw" className="input" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} autoComplete="new-password" />
            </Field>
          )}
        </fieldset>
        {errors.form && (
          <span className="field__error" role="alert">
            {errors.form}
          </span>
        )}
        <RoleSummary role={role} />
        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}

/** What a role can do, in words, under the role picker. */
function RoleSummary({ role }: { role: Role }) {
  const { tx, pick } = useI18n()
  const can = PERMISSIONS.filter((p) => roleCan(role, p))
  return (
    <div className="gr-summary small">
      <div className="strong" style={{ marginBottom: 4 }}>
        {tx(`دور ${ROLE_LABEL[role].ar} يقدر:`, `${ROLE_LABEL[role].en} can:`)}
      </div>
      {can.map((p) => pick(PERMISSION_LABEL[p])).join(tx('، ', ', '))}
    </div>
  )
}

function SecretDrawer({ secret, onClose }: { secret?: Secret; onClose: () => void }) {
  const { tx } = useI18n()
  const { toast } = useAdmin()
  const [copied, setCopied] = useState(false)
  useEffect(() => setCopied(false), [secret])
  const copy = async () => {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret.password)
      setCopied(true)
      toast(tx('اتنسخت كلمة السر', 'Password copied'))
    } catch {
      toast(tx('النسخ ما نجحش. تحديد النص ونسخه يدويًا.', 'Copy failed. Select the text and copy it.'))
    }
  }
  return (
    <Drawer
      open={!!secret}
      onClose={onClose}
      title={tx('كلمة السر الجديدة', 'New password')}
      width={480}
      footer={
        <button className="btn btn--primary" onClick={onClose}>
          {tx('تمام، اتحفظت', 'Done, I’ve saved it')}
        </button>
      }
    >
      {secret && (
        <div className="stack" style={{ gap: 12 }}>
          <p className="small">
            {tx(`دي كلمة سر ${secret.name} (`, `Password for ${secret.name} (`)}
            <bdi dir="ltr">{secret.email}</bdi>
            {tx('). بتظهر المرة دي بس، ومش محفوظة في أي مكان نقدر نرجعلها منه.', '). It is shown this once only and can’t be retrieved later.')}
          </p>
          <div className="adm-secret" dir="ltr">
            <code>{secret.password}</code>
            <button className="btn btn--sm" onClick={() => void copy()}>
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
              {copied ? tx('اتنسخت', 'Copied') : tx('نسخ', 'Copy')}
            </button>
          </div>
          <p className="small muted">{tx('الأفضل توصيلها بشكل خاص (مش في جروب). لو ضاعت، ممكن عمل كلمة سر جديدة من نفس الجدول.', 'Share it privately, not in a group chat. If it’s lost, reset it from the same table.')}</p>
        </div>
      )}
    </Drawer>
  )
}

/** The role × permission table, generated from src/lib/permissions.ts. */
export function PermissionMatrix() {
  const { tx, pick } = useI18n()
  return (
    <Pane title={tx('الصلاحيات حسب الدور', 'Permissions by role')} description={tx('نفس الجدول اللي السيرفر بيطبّقه على كل طلب', 'The same table the server enforces on every request')} flush>
      <div className="table-wrap">
        <table className="table gr-matrix gr-table-tight">
          <thead>
            <tr>
              <th>{tx('الصلاحية', 'Permission')}</th>
              {ROLES.map((r) => (
                <th key={r}>{pick(ROLE_LABEL[r])}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <td>
                  {pick(PERMISSION_LABEL[p])}
                  <span className="tiny faint gr-ltr" style={{ display: 'block' }}>
                    {p}
                  </span>
                </td>
                {ROLES.map((r) => (
                  <td key={r}>
                    {roleCan(r, p) ? <Check size={16} className="yes" aria-label={tx('مسموح', 'Allowed')} /> : <Minus size={16} className="no" aria-label={tx('غير مسموح', 'Not allowed')} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Pane>
  )
}

/* ───────────── Audit log ───────────── */

type AuditEntry = { id: number; at: number; staff_id: string; staff_name: string | null; collection: string; doc_id: string; action: string; detail: string | null }

const COLLECTION_LABEL: Record<string, { ar: string; en: string }> = {
  orders: { ar: 'طلب', en: 'Order' },
  products: { ar: 'منتج', en: 'Product' },
  customers: { ar: 'عميل', en: 'Customer' },
  discounts: { ar: 'خصم', en: 'Discount' },
  reviews: { ar: 'تقييم', en: 'Review' },
  abandoned: { ar: 'سلة متروكة', en: 'Abandoned cart' },
  shipments: { ar: 'شحنة استيراد', en: 'Import shipment' },
  zones: { ar: 'منطقة شحن', en: 'Shipping zone' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  staff: { ar: 'عضو فريق', en: 'Staff member' },
  activity: { ar: 'سجل النشاط', en: 'Activity feed' },
  whatsapp: { ar: 'رسالة واتساب', en: 'WhatsApp message' },
  all: { ar: 'كل البيانات', en: 'All data' },
}
const ACTION_LABEL: Record<string, { ar: string; en: string; tone?: 'ok' | 'warn' | 'bad' | 'info' }> = {
  create: { ar: 'إضافة', en: 'Created', tone: 'ok' },
  update: { ar: 'تعديل', en: 'Updated' },
  delete: { ar: 'حذف', en: 'Deleted', tone: 'bad' },
  reset: { ar: 'إعادة ضبط', en: 'Reset', tone: 'bad' },
  password: { ar: 'كلمة سر', en: 'Password', tone: 'warn' },
  courier: { ar: 'شحنة كورير', en: 'Courier booked', tone: 'info' },
  message: { ar: 'رسالة', en: 'Message', tone: 'info' },
}

function recordLink(collection: string, id: string): string | undefined {
  switch (collection) {
    case 'orders':
      return `/admin/orders/${id}`
    case 'products':
      return `/admin/products/${id}`
    case 'customers':
      return `/admin/customers/${id}`
    case 'discounts':
      return '/admin/discounts'
    case 'reviews':
      return '/admin/reviews'
    case 'abandoned':
      return '/admin/abandoned'
    case 'shipments':
      return '/admin/inventory?tab=shipments'
    case 'zones':
      return '/admin/shipping'
    default:
      return undefined
  }
}

export function AuditPane() {
  const { tx, pick, relTime, date } = useI18n()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const discounts = useStore((s) => s.discounts)
  const staff = useStore((s) => s.staff)
  const [entries, setEntries] = useState<AuditEntry[]>()
  const [err, setErr] = useState<string>()
  const [showFeed, setShowFeed] = useState(false)

  const load = useCallback(() => {
    setErr(undefined)
    api<{ entries: AuditEntry[] }>('/api/admin/audit?limit=300', { admin: true })
      .then((r) => setEntries(r.entries))
      .catch((e) => setErr(e instanceof ApiError ? pick(e.bi) : tx('السجل ما اتحمّلش', 'Couldn’t load the log')))
  }, [pick, tx])
  useEffect(load, [load])

  const name = (collection: string, id: string) => {
    if (collection === 'orders') {
      const o = orders.find((x) => x.id === id)
      return o ? `#${o.number}` : id
    }
    if (collection === 'products') return pick(products.find((x) => x.id === id)?.name) || id
    if (collection === 'customers') return pick(customers.find((x) => x.id === id)?.name) || id
    if (collection === 'discounts') return discounts.find((x) => x.id === id)?.code ?? id
    if (collection === 'staff') return staff.find((x) => x.id === id)?.name ?? id
    if (collection === 'settings' || collection === 'all') return ''
    return id
  }

  const shown = (entries ?? []).filter((e) => showFeed || e.collection !== 'activity')

  return (
    <Pane
      title={tx('سجل التعديلات', 'Audit log')}
      description={tx('كل تعديل اتحفظ على السيرفر: مين عمله وإمتى وعلى أنهي سجل', 'Every write saved on the server: who, when and which record')}
      actions={
        <>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" className="check" checked={showFeed} onChange={(e) => setShowFeed(e.target.checked)} />
            {tx('إظهار سطور سجل النشاط', 'Show activity-feed rows')}
          </label>
          <button className="btn btn--ghost btn--sm btn--icon" onClick={load} aria-label={tx('تحديث', 'Refresh')} title={tx('تحديث', 'Refresh')}>
            <RefreshCw size={14} />
          </button>
        </>
      }
      flush
    >
      {err ? (
        <Empty title={tx('السجل ما اتحمّلش', 'Couldn’t load the log')}>{err}</Empty>
      ) : !entries ? (
        <p className="small muted" style={{ padding: 16 }} aria-busy="true">
          {tx('بيتحمّل…', 'Loading…')}
        </p>
      ) : !shown.length ? (
        <Empty title={tx('مفيش تعديلات لسه', 'No changes yet')}>{tx('أول ما حد يحفظ تعديل هيظهر هنا.', 'Changes appear here as soon as someone saves one.')}</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table gr-table-tight">
            <thead>
              <tr>
                <th>{tx('الوقت', 'When')}</th>
                <th>{tx('مين', 'Who')}</th>
                <th>{tx('الإجراء', 'Action')}</th>
                <th>{tx('السجل', 'Record')}</th>
                <th>{tx('اللي اتغيّر', 'What changed')}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const act = ACTION_LABEL[e.action] ?? { ar: e.action, en: e.action }
                const link = recordLink(e.collection, e.doc_id)
                const label = name(e.collection, e.doc_id)
                const kind = pick(COLLECTION_LABEL[e.collection] ?? { ar: e.collection, en: e.collection })
                return (
                  <tr key={e.id}>
                    <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                      <time dateTime={new Date(e.at).toISOString()} title={date(new Date(e.at).toISOString(), { dateStyle: 'medium', timeStyle: 'short' })}>
                        {relTime(e.at)}
                      </time>
                    </td>
                    <td className="small">
                      <span className="strong">{e.staff_name ?? e.staff_id}</span>
                      <span className="tiny faint gr-ltr" style={{ display: 'block' }}>
                        {e.staff_id}
                      </span>
                    </td>
                    <td>
                      <Badge tone={act.tone} plain>
                        {pick(act)}
                      </Badge>
                    </td>
                    <td className="small">
                      {kind}
                      {label && ' '}
                      {label && (link ? <Link to={link}>{label}</Link> : <bdi>{label}</bdi>)}
                    </td>
                    <td className="tiny muted gr-ltr" style={{ maxWidth: 280 }}>
                      {e.detail}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Pane>
  )
}
