import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Languages, Lock } from 'lucide-react'
import { useI18n } from '../i18n'
import { adminToken, ApiError } from '../lib/api'
import { adminLogin, loadAdmin, useRemote } from '../lib/sync'
import './admin.css'

/*
  With an API the dashboard sits behind a sign-in and works on the server's
  data. Without one (static preview) it opens straight away in demo mode on
  this browser's data, as before.
*/

type Stage = 'checking' | 'login' | 'ready' | 'error'

export function AdminGate({ children }: { children: (p: { online: boolean; signOut: () => void }) => ReactNode }) {
  const online = useRemote((r) => r.online)
  const [stage, setStage] = useState<Stage>('checking')
  const [loadErr, setLoadErr] = useState<string>()
  const { pick } = useI18n()

  const load = async () => {
    setStage('checking')
    try {
      await loadAdmin()
      setStage('ready')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        adminToken.set(undefined)
        setStage('login')
      } else {
        setLoadErr(e instanceof ApiError ? pick(e.bi) : String(e))
        setStage('error')
      }
    }
  }

  useEffect(() => {
    if (online === undefined) return
    if (!online) setStage('ready')
    else if (adminToken.get()) void load()
    else setStage('login')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const signOut = () => {
    const t = adminToken.get()
    if (t) void fetch('/api/admin/logout', { method: 'POST', headers: { authorization: `Bearer ${t}` } }).catch(() => {})
    adminToken.set(undefined)
    setStage('login')
  }

  if (stage === 'ready') return <>{children({ online: online === true, signOut })}</>
  if (stage === 'login') return <AdminLogin onDone={load} />
  if (stage === 'error') return <AdminLogin onDone={load} initialError={loadErr} />
  return <div className="adm-login" aria-busy="true" />
}

function AdminLogin({ onDone, initialError }: { onDone: () => void; initialError?: string }) {
  const { tx, pick, toggle, lang, dir } = useI18n()
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | undefined>(initialError)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = tx('دخول لوحة تحكم نوري', 'Sign in to NURI Admin')
    document.documentElement.dir = dir
    document.documentElement.lang = lang
    ref.current?.focus()
  }, [tx, dir, lang])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pw) {
      setErr(tx('اكتب كلمة السر.', 'Enter the password.'))
      ref.current?.focus()
      return
    }
    setBusy(true)
    setErr(undefined)
    try {
      const { token } = await adminLogin(pw)
      adminToken.set(token)
      setPw('')
      onDone()
    } catch (e) {
      setErr(e instanceof ApiError ? pick(e.bi) : tx('الدخول ما نجحش. جرّب تاني.', 'Sign-in failed. Try again.'))
      setBusy(false)
      ref.current?.select()
    }
  }

  return (
    <div className="adm adm-login" dir={dir}>
      <form className="adm-login__card" onSubmit={submit} noValidate>
        <div className="row-between">
          <span>
            <span className="adm-brand__name">{tx('نوري', 'NURI')}</span>
            <span className="adm-login__sub">{tx('لوحة التحكم', 'Admin')}</span>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={toggle} aria-label={tx('Switch to English', 'التحويل للعربية')}>
            <Languages size={16} aria-hidden />
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
        <h1 className="adm-login__title">{tx('تسجيل الدخول', 'Sign in')}</h1>
        <p className="muted small">{tx('الطلبات والمنتجات والعملاء محفوظين على السيرفر. الدخول بكلمة سر الأدمن.', 'Orders, products and customers are stored on the server. Sign in with the admin password.')}</p>
        <div className="field">
          <label htmlFor="adm-pw">{tx('كلمة السر', 'Password')}</label>
          <input
            ref={ref}
            id="adm-pw"
            className="input"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value)
              setErr(undefined)
            }}
            aria-invalid={!!err || undefined}
            aria-describedby={err ? 'adm-pw-err' : undefined}
          />
          {err && (
            <span className="field__error" id="adm-pw-err" role="alert">
              {err}
            </span>
          )}
        </div>
        <button type="submit" className="btn btn--live adm-login__go" disabled={busy} aria-busy={busy || undefined}>
          <Lock size={16} aria-hidden />
          {busy ? tx('بيدخل…', 'Signing in…') : tx('دخول', 'Sign in')}
        </button>
      </form>
    </div>
  )
}
