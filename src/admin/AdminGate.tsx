import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Languages, Lock } from 'lucide-react'
import { useI18n } from '../i18n'
import { adminToken, ApiError } from '../lib/api'
import { adminLogin, DEMO_ME, fetchMe, loadAdmin, useRemote } from '../lib/sync'
import type { AdminMe } from '../lib/sync'
import './admin.css'

/*
  With an API the dashboard sits behind a per-staff sign-in (email +
  password) and works on the server's data; the signed-in account's role
  decides what the dashboard shows. Without an API (static preview) it opens
  straight away in demo mode on this browser's data as the seed owner.
*/

type Stage = 'checking' | 'login' | 'ready' | 'error'

export function AdminGate({ children }: { children: (p: { online: boolean; signOut: () => void; me: AdminMe }) => ReactNode }) {
  const online = useRemote((r) => r.online)
  const [stage, setStage] = useState<Stage>('checking')
  const [me, setMe] = useState<AdminMe>(DEMO_ME)
  const [loadErr, setLoadErr] = useState<string>()
  const { pick } = useI18n()

  const load = async () => {
    setStage('checking')
    try {
      const [who] = await Promise.all([fetchMe(), loadAdmin()])
      setMe(who)
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
    if (!online) {
      setMe(DEMO_ME)
      setStage('ready')
    }
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

  if (stage === 'ready') return <>{children({ online: online === true, signOut, me })}</>
  if (stage === 'login') return <AdminLogin onDone={load} />
  if (stage === 'error') return <AdminLogin onDone={load} initialError={loadErr} />
  return <div className="adm-login" aria-busy="true" />
}

function AdminLogin({ onDone, initialError }: { onDone: () => void; initialError?: string }) {
  const { tx, pick, toggle, lang, dir } = useI18n()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | undefined>(initialError)
  const [busy, setBusy] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = tx('دخول لوحة تحكم برايت', 'Sign in to Bright Admin')
    document.documentElement.dir = dir
    document.documentElement.lang = lang
    emailRef.current?.focus()
  }, [tx, dir, lang])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !pw) {
      setErr(tx('البريد وكلمة السر مطلوبين.', 'Enter your email and password.'))
      ;(email.trim() ? ref : emailRef).current?.focus()
      return
    }
    setBusy(true)
    setErr(undefined)
    try {
      const { token } = await adminLogin(email.trim(), pw)
      adminToken.set(token)
      setPw('')
      onDone()
    } catch (e) {
      setErr(e instanceof ApiError ? pick(e.bi) : tx('الدخول ما نجحش. محاولة تانية؟', 'Sign-in failed. Try again.'))
      setBusy(false)
      ref.current?.select()
    }
  }

  return (
    <div className="adm adm-login" dir={dir}>
      <form className="adm-login__card" onSubmit={submit} noValidate>
        <div className="row-between">
          <span>
            <span className="adm-brand__name">{tx('برايت', 'Bright')}</span>
            <span className="adm-login__sub">{tx('لوحة التحكم', 'Admin')}</span>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={toggle} aria-label={tx('Switch to English', 'التحويل للعربية')}>
            <Languages size={16} aria-hidden />
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>
        <h1 className="adm-login__title">{tx('تسجيل الدخول', 'Sign in')}</h1>
        <p className="muted small">{tx('الطلبات والمنتجات والعملاء محفوظين على السيرفر. الدخول بالبريد وكلمة السر الخاصين بحسابك في الفريق.', 'Orders, products and customers are stored on the server. Sign in with your own staff email and password.')}</p>
        <div className="field">
          <label htmlFor="adm-email">{tx('البريد الإلكتروني', 'Email')}</label>
          <input
            ref={emailRef}
            id="adm-email"
            className="input"
            type="email"
            dir="ltr"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setErr(undefined)
            }}
            aria-invalid={!!err || undefined}
            aria-describedby={err ? 'adm-pw-err' : undefined}
          />
        </div>
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
