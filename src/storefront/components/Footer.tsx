import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { resolveHref } from '../../data/storefront'
import type { StoreLink } from '../../data/types'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { brandSlug, useBrands, useStorefront } from '../lib'
import { SocialIcons } from './home/WildStrip'
import { Wordmark } from './home/Glyphs'
import '../home.css'
import { useCategories } from '../../lib/useCategories'

/** Size a one-line slogan so it spans its container exactly. */
function useFitLine(dep: string) {
  const box = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const b = box.current
    const l = line.current
    if (!b || !l) return
    const fit = () => {
      l.style.fontSize = '100px'
      const w = l.scrollWidth
      const cs = getComputedStyle(b)
      const avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      if (w && avail > 0) l.style.fontSize = `${Math.min(100 * (avail / w) * 0.99, 400)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(b)
    document.fonts?.ready.then(fit).catch(() => {})
    return () => ro.disconnect()
  }, [dep])
  return { box, line }
}

function FootLink({ link, children }: { link: StoreLink; children: string }) {
  const settings = useStore((s) => s.settings)
  const href = resolveHref(link.href, settings)
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>
  const external = href.startsWith('http')
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}

export function Footer() {
  const { tx, pick, money, lang } = useI18n()
  const { label: catLabel, shown: shownCats } = useCategories()
  const content = useStorefront()
  const zones = useStore((s) => s.zones)
  const settings = useStore((s) => s.settings)
  const brands = useBrands()
  const cairo = zones[0]
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const slogan = pick(content.slogan).trim() || tx('بشرتك، بس أحلى.', 'Your skin, only brighter.')
  const { box, line } = useFitLine(slogan)
  const foot = content.footer

  const join = (e: FormEvent) => {
    e.preventDefault()
    // Demo: no network call. The confirmation is shown inline.
    setJoined(true)
  }

  return (
    <footer className="v-foot">
      <div className="v-wrap v-foot__grid">
        <div className="v-foot__club">
          <h2 className="v-foot__h" id="v-club-h">{pick(foot.clubTitle) || tx('انضمي لنادي برايت.', 'Join the Bright club.')}</h2>
          {joined ? (
            <p className="v-foot__ok" role="status">
              {pick(foot.clubOk) || tx('اتسجّلتي. هنبعتلك أول عرض.', "You're in. First offer is on its way.")}
            </p>
          ) : (
            <form className="v-news" onSubmit={join} aria-labelledby="v-club-h">
              <label htmlFor="v-news-email" className="sr-only">{tx('إيميلك', 'Your email')}</label>
              <input
                id="v-news-email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={tx('الإيميل', 'Email')}
              />
              <button type="submit" className="v-news__go" aria-label={tx('اشتركي', 'Sign up')}>
                <ArrowRight size={22} strokeWidth={1.5} className="v-flip" aria-hidden="true" />
              </button>
            </form>
          )}
          <p className="v-mono v-foot__note">
            {pick(foot.clubNote) || tx('عروض وأول المنتجات الجديدة. من غير زحمة.', 'Offers and first look at new drops. No spam.')}
          </p>
          <Link to="/" className="v-foot__mark" aria-label={tx('برايت، الصفحة الرئيسية', 'Bright home')}>
            <Wordmark />
          </Link>
        </div>

        {foot.columns.map((col, i) => (
          <nav className="v-foot__col" aria-label={pick(col.title)} key={col.id}>
            <h2 className="v-foot__ch">{pick(col.title)}</h2>
            <ul>
              {col.mode === 'categories' && (
                <>
                  <li><Link to="/shop">{tx('كل المنتجات', 'All products')}</Link></li>
                  {shownCats.slice(0, col.limit).map(({ id: c }) => (
                    <li key={c}><Link to={`/shop/${c}`}>{pick(catLabel(c))}</Link></li>
                  ))}
                </>
              )}
              {col.mode === 'brands' &&
                brands.slice(0, col.limit).map(([name]) => (
                  <li key={name}>
                    <Link to={`/brand/${brandSlug(name)}`} lang="en"><bdi>{name}</bdi></Link>
                  </li>
                ))}
              {col.mode === 'links' &&
                col.links.slice(0, col.limit || col.links.length).map((link) => {
                  const label = pick(link.label)
                  const href = resolveHref(link.href, settings)
                  const page = content.pages.find((p) => `/info/${p.slug}` === href)
                  if (!label || (page && !page.published)) return null
                  return (
                    <li key={link.id}>
                      <FootLink link={link}>{label}</FootLink>
                    </li>
                  )
                })}
            </ul>
            {i === foot.columns.length - 1 && <SocialIcons className="v-foot__social" />}
          </nav>
        ))}
      </div>

      <div className="v-foot__slogan" ref={box} aria-hidden="true">
        <p ref={line} lang={lang}>{slogan}</p>
      </div>

      <div className="v-wrap v-foot__legal">
        <p id="v-ship">
          {foot.legalMode === 'custom' && pick(foot.legal)
            ? pick(foot.legal)
            : cairo
              ? tx(
                  `الدفع عند الاستلام في كل المحافظات. التوصيل في ${cairo.name.ar} خلال ${cairo.etaDays[0]}–${cairo.etaDays[1]} يوم، ومجاني فوق ${money(cairo.freeOver)}.`,
                  `Cash on delivery in every governorate. ${cairo.name.en} in ${cairo.etaDays[0]}–${cairo.etaDays[1]} days, free over ${money(cairo.freeOver)}.`,
                )
              : pick(foot.legal)}
        </p>
        <p>
          <bdi>© 2026 Bright</bdi> · <a href={`mailto:${settings.email}`}>{settings.email}</a> · <span dir="ltr">{settings.whatsapp}</span>
        </p>
      </div>
    </footer>
  )
}
