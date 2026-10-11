import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CATEGORY_LABEL } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { CATEGORIES, brandSlug, useBrands } from '../lib'
import { SocialIcons } from './home/WildStrip'
import { Wordmark } from './home/Glyphs'
import '../home.css'

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

export function Footer() {
  const { tx, pick, money, lang } = useI18n()
  const zones = useStore((s) => s.zones)
  const settings = useStore((s) => s.settings)
  const brands = useBrands()
  const cairo = zones[0]
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  const slogan = tx('بشرتك، بس أحلى.', 'Your skin, only brighter.')
  const { box, line } = useFitLine(slogan)
  const wa = settings.whatsapp.replace(/\D/g, '')

  const join = (e: FormEvent) => {
    e.preventDefault()
    // Demo: no network call. The confirmation is shown inline.
    setJoined(true)
  }

  return (
    <footer className="v-foot">
      <div className="v-wrap v-foot__grid">
        <div className="v-foot__club">
          <h2 className="v-foot__h" id="v-club-h">{tx('انضمي لنادي برايت.', 'Join the Bright club.')}</h2>
          {joined ? (
            <p className="v-foot__ok" role="status">
              {tx('اتسجّلتي. هنبعتلك أول عرض.', "You're in. First offer is on its way.")}
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
            {tx('عروض وأول المنتجات الجديدة. من غير زحمة.', 'Offers and first look at new drops. No spam.')}
          </p>
          <Link to="/" className="v-foot__mark" aria-label={tx('برايت، الصفحة الرئيسية', 'Bright home')}>
            <Wordmark />
          </Link>
        </div>

        <nav className="v-foot__col" aria-label={tx('الأقسام', 'Categories')}>
          <h2 className="v-foot__ch">{tx('تسوّقي', 'Shop')}</h2>
          <ul>
            <li><Link to="/shop">{tx('كل المنتجات', 'All products')}</Link></li>
            {CATEGORIES.slice(0, 6).map((c) => (
              <li key={c}><Link to={`/shop/${c}`}>{pick(CATEGORY_LABEL[c])}</Link></li>
            ))}
          </ul>
        </nav>
        <nav className="v-foot__col" aria-label={tx('الماركات', 'Brands')}>
          <h2 className="v-foot__ch">{tx('الماركات', 'Brands')}</h2>
          <ul>
            {brands.slice(0, 7).map(([b]) => (
              <li key={b}><Link to={`/brand/${brandSlug(b)}`} lang="en"><bdi>{b}</bdi></Link></li>
            ))}
          </ul>
        </nav>
        <nav className="v-foot__col" aria-label={tx('المساعدة', 'Help')}>
          <h2 className="v-foot__ch">{tx('مساعدة', 'Help')}</h2>
          <ul>
            <li><a href="#v-ship">{tx('الشحن والدفع', 'Shipping')}</a></li>
            <li><a href={`mailto:${settings.email}?subject=${encodeURIComponent('Return')}`}>{tx('الاسترجاع', 'Returns')}</a></li>
            <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{tx('كلّمينا واتساب', 'Contact')}</a></li>
            <li><Link to="/account">{tx('تتبّعي طلبك', 'Track your order')}</Link></li>
            <li><Link to="/routine">{tx('اعرفي بشرتك', 'Skin quiz')}</Link></li>
            <li><Link to="/admin">{tx('لوحة التحكم', 'Admin')}</Link></li>
          </ul>
          <SocialIcons className="v-foot__social" />
        </nav>
      </div>

      <div className="v-foot__slogan" ref={box} aria-hidden="true">
        <p ref={line} lang={lang}>{slogan}</p>
      </div>

      <div className="v-wrap v-foot__legal">
        <p id="v-ship">
          {tx(
            `الدفع عند الاستلام في كل المحافظات. التوصيل في ${cairo.name.ar} خلال ${cairo.etaDays[0]}–${cairo.etaDays[1]} يوم، ومجاني فوق ${money(cairo.freeOver)}.`,
            `Cash on delivery in every governorate. ${cairo.name.en} in ${cairo.etaDays[0]}–${cairo.etaDays[1]} days, free over ${money(cairo.freeOver)}.`,
          )}
        </p>
        <p>
          <bdi>© 2026 Bright</bdi> · <a href={`mailto:${settings.email}`}>{settings.email}</a> · <span dir="ltr">{settings.whatsapp}</span>
        </p>
      </div>
    </footer>
  )
}
