import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, Heart, Search, ShoppingBag, User, X } from 'lucide-react'
import { CATEGORY_LABEL } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { CATEGORIES, IMPORTED_ORIGINS, brandSlug, useActiveProducts, useBrands } from '../lib'
import { Door } from './Door'
import { Ticker } from './home/Ticker'
import { Wordmark } from './home/Glyphs'
import { useScrollFrame } from './home/scroll'
import '../home.css'

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
    <form className="v-search" role="search" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        {tx('ابحثي في المتجر', 'Search the store')}
      </label>
      <input
        id={id}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tx('دوّري على منتج أو ماركة', 'Search products or brands')}
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      <button type="submit" className="v-round" aria-label={tx('ابحثي', 'Search')}>
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
  const products = useActiveProducts()
  const brands = useBrands()
  const loc = useLocation()
  const [panel, setPanel] = useState<'cat' | 'brand' | null>(null)
  const [mobile, setMobile] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [atTop, setAtTop] = useState(true)
  const headerRef = useRef<HTMLElement>(null)
  const home = loc.pathname === '/'

  // Close every panel when the route changes.
  const routeKey = loc.pathname + loc.search
  const [lastRoute, setLastRoute] = useState(routeKey)
  if (routeKey !== lastRoute) {
    setLastRoute(routeKey)
    setPanel(null)
    setMobile(false)
    setSearchOpen(false)
  }

  // Over the home hero the bar is transparent; it turns cream as soon as the hero starts to shrink.
  useScrollFrame(({ y }) => setAtTop(y < 24), home)

  useEffect(() => {
    if (!panel && !searchOpen) return
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setPanel(null)
        setSearchOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPanel(null)
      setSearchOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [panel, searchOpen])

  const solid = !home || !atTop || panel !== null || searchOpen
  const catCount = (c: string) => products.filter((p) => p.category === c).length
  const langLabel = lang === 'ar' ? 'EN' : 'ع'
  const langAria = lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'
  const togglePanel = (p: 'cat' | 'brand') => {
    setSearchOpen(false)
    setPanel(panel === p ? null : p)
  }

  const langBtn = (
    <button type="button" className="v-round v-round--lang" onClick={toggle} aria-label={langAria} lang={lang === 'ar' ? 'en' : 'ar'}>
      {langLabel}
    </button>
  )
  const cartBtn = (
    <button type="button" className="v-round" onClick={() => setCartOpen(true)} aria-label={tx(`افتحي السلة (${num(count)})`, `Open bag (${num(count)})`)}>
      <ShoppingBag size={18} aria-hidden="true" />
      {count > 0 && <span className="v-badge" aria-hidden="true">{num(count)}</span>}
    </button>
  )
  const searchBtn = (
    <button
      type="button"
      className="v-round"
      aria-expanded={searchOpen}
      aria-controls="v-searchrow"
      onClick={() => {
        setPanel(null)
        setSearchOpen((v) => !v)
      }}
      aria-label={searchOpen ? tx('اقفلي البحث', 'Close search') : tx('ابحثي', 'Search')}
    >
      {searchOpen ? <X size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
    </button>
  )

  return (
    <>
      <Ticker />
      <header className="v-header" data-solid={solid || undefined} ref={headerRef}>
        <div className="v-header__bar">
          <div className="v-header__start">
            <nav className="v-nav v-desk" aria-label={tx('التصفح الرئيسي', 'Main')}>
              <NavLink to="/" end className="v-nav__a">
                {tx('الرئيسية', 'Home')}
              </NavLink>
              <button type="button" className="v-nav__a" aria-expanded={panel === 'cat'} aria-controls="v-panel-cat" onClick={() => togglePanel('cat')}>
                {tx('المنتجات', 'Products')}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <button type="button" className="v-nav__a" aria-expanded={panel === 'brand'} aria-controls="v-panel-brand" onClick={() => togglePanel('brand')}>
                {tx('الماركات', 'Brands')}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <NavLink to="/routine" className="v-nav__a">
                {tx('اعرفي بشرتك', 'Skin quiz')}
              </NavLink>
            </nav>
            <div className="v-mob v-header__mobstart">
              <button type="button" className="v-menu" onClick={() => setMobile(true)} aria-label={tx('افتحي القائمة', 'Open menu')}>
                {tx('القائمة', 'Menu')}
              </button>
              {searchBtn}
            </div>
          </div>

          <Link to="/" className="v-header__mark" aria-label={tx('برايت، الصفحة الرئيسية', 'Bright home')}>
            <Wordmark />
          </Link>

          <div className="v-header__end">
            <span className="v-desk">{searchBtn}</span>
            <Link to="/account" className="v-round v-desk" aria-label={tx('حسابي وطلباتي', 'My account and orders')}>
              <User size={18} aria-hidden="true" />
            </Link>
            <Link to="/wishlist" className="v-round v-desk" aria-label={tx(`المفضلة (${num(wish)})`, `Wishlist (${num(wish)})`)}>
              <Heart size={18} aria-hidden="true" />
              {wish > 0 && <span className="v-badge" aria-hidden="true">{num(wish)}</span>}
            </Link>
            {cartBtn}
            {langBtn}
          </div>
        </div>

        {searchOpen && (
          <div className="v-drop-panel" id="v-searchrow">
            <div className="v-wrap">
              <SearchForm id="v-q" autoFocus />
            </div>
          </div>
        )}

        <div className="v-drop-panel" id="v-panel-cat" hidden={panel !== 'cat'}>
          <div className="v-wrap">
            <ul className="v-mega">
              <li>
                <Link to="/shop" className="v-mega__a">
                  <span>{tx('كل المنتجات', 'All products')}</span>
                  <span className="v-mega__n">{num(products.length)}</span>
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <Link to={`/shop/${c}`} className="v-mega__a">
                    <span>{pick(CATEGORY_LABEL[c])}</span>
                    <span className="v-mega__n">{num(catCount(c))}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/shop?origin=KR" className="v-mega__a">
                  <span>{tx('كوري', 'K-beauty')}</span>
                </Link>
              </li>
              <li>
                <Link to={IMPORTED_Q} className="v-mega__a">
                  <span>{tx('مستورد', 'Imported')}</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="v-drop-panel" id="v-panel-brand" hidden={panel !== 'brand'}>
          <div className="v-wrap">
            <ul className="v-mega v-mega--brands">
              {brands.map(([b, n]) => (
                <li key={b}>
                  <Link to={`/brand/${brandSlug(b)}`} className="v-mega__a" lang="en">
                    <span><bdi>{b}</bdi></span>
                    <span className="v-mega__n">{num(n)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <Door open={mobile} onClose={() => setMobile(false)} side="start" title={tx('القائمة', 'Menu')}>
        <div className="v-mmenu">
          <SearchForm id="v-q-menu" />
          <nav aria-label={tx('التصفح الرئيسي', 'Main')}>
            <ul className="v-mmenu__big">
              <li><Link to="/">{tx('الرئيسية', 'Home')}</Link></li>
              <li><Link to="/shop">{tx('كل المنتجات', 'All products')}</Link></li>
              <li><Link to="/routine">{tx('اعرفي بشرتك', 'Skin quiz')}</Link></li>
              <li><Link to="/shop?origin=KR">{tx('كوري', 'K-beauty')}</Link></li>
              <li><Link to={IMPORTED_Q}>{tx('مستورد', 'Imported')}</Link></li>
            </ul>
            <ul className="v-mmenu__row">
              <li><Link to="/account">{tx('حسابي وطلباتي', 'My account and orders')}</Link></li>
              <li><Link to="/wishlist">{tx(`المفضلة (${num(wish)})`, `Wishlist (${num(wish)})`)}</Link></li>
              <li>
                <button type="button" onClick={toggle} lang={lang === 'ar' ? 'en' : 'ar'}>
                  {lang === 'ar' ? 'English' : 'العربية'}
                </button>
              </li>
            </ul>
            <h3 className="v-mmenu__h">{tx('الأقسام', 'Categories')}</h3>
            <ul className="v-mmenu__two">
              {CATEGORIES.map((c) => (
                <li key={c}><Link to={`/shop/${c}`}>{pick(CATEGORY_LABEL[c])}</Link></li>
              ))}
            </ul>
            <h3 className="v-mmenu__h">{tx('الماركات', 'Brands')}</h3>
            <ul className="v-mmenu__two">
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
