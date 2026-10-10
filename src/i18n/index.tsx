import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Lang = 'ar' | 'en'
export type Bi = { ar: string; en: string }

type I18n = {
  lang: Lang
  dir: 'rtl' | 'ltr'
  setLang: (l: Lang) => void
  toggle: () => void
  /** Inline bilingual string: tx('مرحبا', 'Hello') */
  tx: (ar: string, en: string) => string
  /** Pick from a bilingual record */
  pick: (b: Bi | undefined) => string
  money: (n: number, opts?: { compact?: boolean }) => string
  num: (n: number, opts?: Intl.NumberFormatOptions) => string
  pct: (n: number, digits?: number) => string
  date: (d: string | number | Date, opts?: Intl.DateTimeFormatOptions) => string
  relTime: (d: string | number | Date) => string
}

const LS_KEY = 'nuri-lang'
const Ctx = createContext<I18n | null>(null)

// Western digits in both languages — what Egyptian shoppers read on every
// major store — with Arabic month names and currency in Arabic.
const locale = (l: Lang) => (l === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB')

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(LS_KEY)
      return v === 'en' ? 'en' : 'ar'
    } catch {
      return 'ar'
    }
  })

  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    try {
      localStorage.setItem(LS_KEY, lang)
    } catch {
      /* storage blocked */
    }
  }, [lang, dir])

  const setLang = useCallback((l: Lang) => setLangState(l), [])
  const toggle = useCallback(() => setLangState((l) => (l === 'ar' ? 'en' : 'ar')), [])

  const value = useMemo<I18n>(() => {
    const loc = locale(lang)
    const nf = new Intl.NumberFormat(loc)
    const tx = (ar: string, en: string) => (lang === 'ar' ? ar : en)
    return {
      lang,
      dir,
      setLang,
      toggle,
      tx,
      pick: (b) => (b ? b[lang] : ''),
      money: (n, opts) => {
        const v = opts?.compact
          ? new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
          : new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(Math.round(n))
        return lang === 'ar' ? `${v} ج.م` : `EGP ${v}`
      },
      num: (n, opts) => (opts ? new Intl.NumberFormat(loc, opts).format(n) : nf.format(n)),
      pct: (n, digits = 1) =>
        new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: digits }).format(n),
      date: (d, opts) =>
        new Intl.DateTimeFormat(loc, opts ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(d),
        ),
      relTime: (d) => {
        const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })
        const diff = (new Date(d).getTime() - Date.now()) / 1000
        const abs = Math.abs(diff)
        if (abs < 60) return rtf.format(Math.round(diff), 'second')
        if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
        if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
        if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
        if (abs < 86400 * 365) return rtf.format(Math.round(diff / (86400 * 30)), 'month')
        return rtf.format(Math.round(diff / (86400 * 365)), 'year')
      },
    }
  }, [lang, dir, setLang, toggle])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useI18n outside I18nProvider')
  return v
}
