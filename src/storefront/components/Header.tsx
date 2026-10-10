import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User } from 'lucide-react'
import { NuriMark } from '../../components/Lattice'
import { CATEGORY_LABEL } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { CATEGORIES, IMPORTED_ORIGINS, brandSlug, useActiveProducts, useBrands } from '../lib'
import { Door } from './Door'

const IMPORTED_Q = `/shop?origin=${IMPORTED_ORIGINS.join(',')}`

function SearchForm({ id, autoFocus }: { id: string; autoFocus?: boolean }) {
  const { tx } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const loc = useLocation()
  const [q, setQ] = useState(loc.pathname === '/search' ? (params.get('q') ?? '') : '')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const v = q.trim()
    navigate(v ? `/search?q=${encodeURIComponent(v)}` : '/shop')
  }
  return (
    <form className="sf-search" role="search" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        {tx('ابحثي في المتجر', 'Search the store')}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tx('دوّري على منتج', 'Search products')}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      <button type="submit" className="sf-search__go" aria-label={tx('ابحثي', 'Search')}>
        <Search size={18} aria-hidden="true" />
      </button>
    </form>
  )
}

export function Header() {
  const { tx, pick, toggle, lang, num } = useI18n()
  const count = useStore((s) => s.cart.reduce((n, l) => n + l.qty, 0))
  const wish = useStore((s) => s.wishlist.length)
  const setCartOpen = useStore((s) => s.setCartOpen)
  const announcement = useStore((s) => s.settings.announcement)
  const products = useActiveProducts()
  const brands = useBrands()
  const loc = useLocation()
  const [panel, setPanel] = useState<'cat' | 'brand' | null>(null)
  const [mobile, setMobile] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  // Close every panel when the route changes.
  const routeKey = loc.pathname + loc.search
  const [lastRoute, setLastRoute] = useState(routeKey)
  if (routeKey !== lastRoute) {
    setLastRoute(routeKey)
    setPanel(null)
    setMobile(false)
    setSearchOpen(false)
  }

  useEffect(() => {
    if (!panel) return
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setPanel(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel])

  const catCount = (c: string) => products.filter((p) => p.category === c).length
  const langLabel = lang === 'ar' ? 'EN' : 'ع'
  const langAria = lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'

  return (
    <>
      <p className="sf-announce">{pick(announcement)}</p>
      <header className="sf-header" ref={headerRef}>
        <div className="sf-header__bar sf-wrap">
          <button type="button" className="sf-iconbtn sf-only-mobile" onClick={() => setMobile(true)} aria-label={tx('افتحي القائمة', 'Open menu')}>
            <Menu size={22} aria-hidden="true" />
          </button>
          <Link to="/" className="sf-brand" aria-label={tx('نوري، الصفحة الرئيسية', 'NURI home')}>
            <NuriMark size={36} frame="var(--lacquer-950)" pane="var(--paper-lit)" />
            <span className="sf-brand__word" aria-hidden="true">
              <span lang="ar">نوري</span>
              <span lang="en">NURI</span>
            </span>
          </Link>

          <nav className="sf-nav sf-only-desktop" aria-label={tx('التصفح الرئيسي', 'Main')}>
            <button type="button" className="sf-nav__link" aria-expanded={panel === 'cat'} aria-controls="sf-panel-cat" onClick={() => setPanel(panel === 'cat' ? null : 'cat')}>
              {tx('الأقسام', 'Categories')}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <button type="button" className="sf-nav__link" aria-expanded={panel === 'brand'} aria-controls="sf-panel-brand" onClick={() => setPanel(panel === 'brand' ? null : 'brand')}>
              {tx('الماركات', 'Brands')}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <Link to="/shop?origin=KR" className="sf-nav__link">
              {tx('كوري', 'K-beauty')}
            </Link>
            <Link to={IMPORTED_Q} className="sf-nav__link">
              {tx('مستورد', 'Imported')}
            </Link>
            <NavLink to="/routine" className="sf-nav__link">
              {tx('اعرفي روتينك', 'Routine finder')}
            </NavLink>
          </nav>

          <div className="sf-header__tools">
            <div className="sf-only-desktop sf-header__search">
              <SearchForm id="sf-q-desk" key={routeKey} />
            </div>
            <button type="button" className="sf-iconbtn sf-only-mobile" aria-expanded={searchOpen} aria-controls="sf-msearch" onClick={() => setSearchOpen((v) => !v)} aria-label={tx('ابحثي', 'Search')}>
              <Search size={20} aria-hidden="true" />
            </button>
            <button type="button" className="sf-lang" onClick={toggle} aria-label={langAria} lang={lang === 'ar' ? 'en' : 'ar'}>
              {langLabel}
            </button>
            <Link to="/account" className="sf-iconbtn sf-only-desktop" aria-label={tx('حسابي وطلباتي', 'My account and orders')}>
              <User size={20} aria-hidden="true" />
            </Link>
            <Link to="/wishlist" className="sf-iconbtn sf-badgewrap" aria-label={tx(`المفضلة (${num(wish)})`, `Wishlist (${num(wish)})`)}>
              <Heart size={20} aria-hidden="true" />
              {wish > 0 && <span className="sf-badge" aria-hidden="true">{num(wish)}</span>}
            </Link>
            <button type="button" className="sf-iconbtn sf-badgewrap" onClick={() => setCartOpen(true)} aria-label={tx(`افتحي السلة (${num(count)})`, `Open bag (${num(count)})`)}>
              <ShoppingBag size={20} aria-hidden="true" />
              {count > 0 && <span className="sf-badge" aria-hidden="true">{num(count)}</span>}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="sf-msearch sf-only-mobile" id="sf-msearch">
            <div className="sf-wrap">
              <SearchForm id="sf-q-mob" autoFocus />
            </div>
          </div>
        )}

        <div className="sf-megapanel" id="sf-panel-cat" hidden={panel !== 'cat'}>
          <div className="sf-wrap">
            <ul className="sf-megagrid">
              <li>
                <Link to="/shop" className="sf-megalink">
                  <span>{tx('كل المنتجات', 'All products')}</span>
                  <span className="sf-megalink__n">{num(products.length)}</span>
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link to={`/shop/${c}`} className="sf-megalink">
                    <span>{pick(CATEGORY_LABEL[c])}</span>
                    <span className="sf-megalink__n">{num(catCount(c))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="sf-megapanel" id="sf-panel-brand" hidden={panel !== 'brand'}>
          <div className="sf-wrap">
            <ul className="sf-megagrid sf-megagrid--brands">
              {brands.map(([b, n]) => (
                <li key={b}>
                  <Link to={`/brand/${brandSlug(b)}`} className="sf-megalink" lang="en">
                    <span><bdi>{b}</bdi></span>
                    <span className="sf-megalink__n">{num(n)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <Door open={mobile} onClose={() => setMobile(false)} side="start" title={tx('القائمة', 'Menu')}>
        <div className="sf-mmenu">
          <SearchForm id="sf-q-menu" />
          <nav aria-label={tx('التصفح الرئيسي', 'Main')}>
            <ul className="sf-mmenu__list">
              <li><Link to="/routine">{tx('اعرفي روتينك', 'Routine finder')}</Link></li>
              <li><Link to="/shop?origin=KR">{tx('كوري', 'K-beauty')}</Link></li>
              <li><Link to={IMPORTED_Q}>{tx('مستورد', 'Imported')}</Link></li>
              <li><Link to="/account">{tx('حسابي وطلباتي', 'My account and orders')}</Link></li>
              <li><Link to="/wishlist">{tx('المفضلة', 'Wishlist')}</Link></li>
            </ul>
            <h3 className="sf-mmenu__h">{tx('الأقسام', 'Categories')}</h3>
            <ul className="sf-mmenu__list sf-mmenu__list--two">
              {CATEGORIES.map((c) => (
                <li key={c}><Link to={`/shop/${c}`}>{pick(CATEGORY_LABEL[c])}</Link></li>
              ))}
            </ul>
            <h3 className="sf-mmenu__h">{tx('الماركات', 'Brands')}</h3>
            <ul className="sf-mmenu__list sf-mmenu__list--two">
              {brands.map(([b]) => (
                <li key={b}><Link to={`/brand/${brandSlug(b)}`} lang="en"><bdi>{b}</bdi></Link></li>
              ))}
            </ul>
          </nav>
        </div>
      </Door>
    </>
  )
}
