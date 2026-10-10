import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  Home,
  Languages,
  Menu,
  Moon,
  Package,
  Percent,
  Radio,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Sun,
  Truck,
  Users,
  UsersRound,
  type LucideProps,
} from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { LatticePattern, NuriMark } from '../components/Lattice'
import { AdminContext, ToastHost, useToasts } from './ui'
import { expiringBatches, stock } from '../lib/metrics'
import './admin.css'

import Overview from './pages/Overview'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Products from './pages/Products'
import ProductEditor from './pages/ProductEditor'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Segments from './pages/Segments'
import Discounts from './pages/Discounts'
import Analytics from './pages/Analytics'
import Abandoned from './pages/Abandoned'
import Reviews from './pages/Reviews'
import Shipping from './pages/Shipping'
import SettingsPage from './pages/Settings'
import Live from './pages/Live'

type NavItem = { to: string; ar: string; en: string; icon: ComponentType<LucideProps>; count?: number; live?: boolean; end?: boolean }

const THEME_KEY = 'nuri-admin-theme'

export default function AdminApp() {
  const { tx, toggle, lang, dir } = useI18n()
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [railOpen, setRailOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { toasts, toast } = useToasts()
  const location = useLocation()

  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const reviews = useStore((s) => s.reviews)
  const abandoned = useStore((s) => s.abandoned)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage blocked */
    }
  }, [theme])

  useEffect(() => setRailOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = tx('لوحة تحكم نوري', 'NURI Admin')
  }, [tx])

  const counts = useMemo(() => {
    const toFulfill = orders.filter((o) => o.status !== 'cancelled' && (o.fulfillment === 'unfulfilled' || o.fulfillment === 'packed')).length
    const lowStock = products.filter((p) => p.status === 'active' && stock(p) <= p.lowStockAt).length
    const expiring = expiringBatches(products, settings.expiryWarnDays).length
    const pendingReviews = reviews.filter((r) => r.status === 'pending').length
    const carts = abandoned.filter((a) => !a.recovered).length
    return { toFulfill, inventory: lowStock + expiring, pendingReviews, carts }
  }, [orders, products, reviews, abandoned, settings.expiryWarnDays])

  const groups: { ar: string; en: string; items: NavItem[] }[] = [
    {
      ar: 'اليوم',
      en: 'Today',
      items: [
        { to: '/admin', ar: 'الرئيسية', en: 'Home', icon: Home, end: true },
        { to: '/admin/live', ar: 'مباشر الآن', en: 'Live view', icon: Radio, live: true },
      ],
    },
    {
      ar: 'البيع',
      en: 'Sell',
      items: [
        { to: '/admin/orders', ar: 'الطلبات', en: 'Orders', icon: ShoppingBag, count: counts.toFulfill, live: counts.toFulfill > 0 },
        { to: '/admin/abandoned', ar: 'سلال متروكة', en: 'Abandoned carts', icon: ShoppingCart, count: counts.carts },
        { to: '/admin/products', ar: 'المنتجات', en: 'Products', icon: Package },
        { to: '/admin/inventory', ar: 'المخزون والصلاحية', en: 'Stock & expiry', icon: Boxes, count: counts.inventory },
      ],
    },
    {
      ar: 'العملاء',
      en: 'Customers',
      items: [
        { to: '/admin/customers', ar: 'العملاء', en: 'Customers', icon: Users },
        { to: '/admin/segments', ar: 'الشرائح', en: 'Segments', icon: UsersRound },
        { to: '/admin/reviews', ar: 'التقييمات', en: 'Reviews', icon: Star, count: counts.pendingReviews },
        { to: '/admin/discounts', ar: 'الخصومات', en: 'Discounts', icon: Percent },
      ],
    },
    {
      ar: 'التحليل والإعداد',
      en: 'Insight & setup',
      items: [
        { to: '/admin/analytics', ar: 'التحليلات', en: 'Analytics', icon: BarChart3 },
        { to: '/admin/shipping', ar: 'الشحن والمحافظات', en: 'Shipping', icon: Truck },
        { to: '/admin/settings', ar: 'الإعدادات', en: 'Settings', icon: SettingsIcon },
      ],
    },
  ]

  const ctx = useMemo(
    () => ({ theme, setTheme, toast, staff: 'Gamal Saad', openPalette: () => setPaletteOpen(true) }),
    [theme, toast],
  )

  return (
    <AdminContext.Provider value={ctx}>
      <div className="adm" data-theme={theme}>
        <div className="adm-shell">
          <aside className="adm-rail" data-open={railOpen} aria-label={tx('القائمة الرئيسية', 'Main menu')}>
            <Link to="/admin" className="adm-brand">
              <NuriMark size={32} frame="var(--paper)" pane="var(--lacquer-900)" light="var(--brass)" />
              <span>
                <span className="adm-brand__name">{tx('نوري', 'NURI')}</span>
                <br />
                <span className="adm-brand__sub">{tx('لوحة التحكم', 'Admin')}</span>
              </span>
            </Link>
            <nav className="adm-nav">
              {groups.map((g) => (
                <div className="adm-nav__group" key={g.en}>
                  <div className="adm-nav__heading">{tx(g.ar, g.en)}</div>
                  {g.items.map((it) => (
                    <NavLink key={it.to} to={it.to} end={it.end}>
                      <it.icon size={18} strokeWidth={1.75} aria-hidden />
                      {tx(it.ar, it.en)}
                      {it.count ? (
                        <span className={`adm-nav__count ${it.live ? 'adm-nav__count--live' : ''}`}>{it.count}</span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
            <div className="adm-rail__foot">
              <Store size={16} aria-hidden />
              <Link to="/" style={{ color: 'inherit' }}>
                {tx('افتح المتجر', 'View store')}
              </Link>
            </div>
            <LatticePattern className="adm-rail__lattice" cell={48} width={1.5} />
          </aside>
          {railOpen && <div className="drawer-scrim" style={{ zIndex: 55 }} onClick={() => setRailOpen(false)} />}

          <div className="adm-main">
            <header className="adm-top">
              <button className="btn btn--ghost btn--icon adm-menu-btn" onClick={() => setRailOpen(true)} aria-label={tx('افتح القائمة', 'Open menu')}>
                <Menu size={20} />
              </button>
              <button className="adm-search" onClick={() => setPaletteOpen(true)}>
                <Search size={16} aria-hidden />
                <span className="ellipsis">{tx('بحث في الطلبات والمنتجات والعملاء…', 'Search orders, products, customers…')}</span>
                <kbd>Ctrl K</kbd>
              </button>
              <div className="row" style={{ marginInlineStart: 'auto' }}>
                <button className="btn btn--ghost btn--sm" onClick={toggle} aria-label={tx('Switch to English', 'التحويل للعربية')}>
                  <Languages size={16} aria-hidden />
                  {lang === 'ar' ? 'EN' : 'ع'}
                </button>
                <button
                  className="btn btn--ghost btn--icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  aria-label={theme === 'dark' ? tx('الوضع الفاتح', 'Light mode') : tx('الوضع الداكن', 'Dark mode')}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </header>
            <main className="adm-content" dir={dir}>
              <Routes>
                <Route index element={<Overview />} />
                <Route path="live" element={<Live />} />
                <Route path="orders" element={<Orders />} />
                <Route path="orders/:id" element={<OrderDetail />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductEditor />} />
                <Route path="products/:id" element={<ProductEditor />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="customers" element={<Customers />} />
                <Route path="customers/:id" element={<CustomerDetail />} />
                <Route path="segments" element={<Segments />} />
                <Route path="discounts" element={<Discounts />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="abandoned" element={<Abandoned />} />
                <Route path="reviews" element={<Reviews />} />
                <Route path="shipping" element={<Shipping />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Overview />} />
              </Routes>
            </main>
          </div>
        </div>
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
        <ToastHost toasts={toasts} />
      </div>
    </AdminContext.Provider>
  )
}

/* ───────────── Command palette: every record and action in one box ───────────── */

type Cmd = { id: string; group: string; label: string; hint?: string; run: () => void }

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { tx, pick, money, toggle } = useI18n()
  const navigate = useNavigate()
  const orders = useStore((s) => s.orders)
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const go = (to: string) => () => {
    navigate(to)
    onClose()
  }

  const items = useMemo<Cmd[]>(() => {
    const s = q.trim().toLowerCase()
    const pages: Cmd[] = [
      { id: 'pg-home', group: tx('صفحات', 'Pages'), label: tx('الرئيسية', 'Home'), run: go('/admin') },
      { id: 'pg-orders', group: tx('صفحات', 'Pages'), label: tx('الطلبات', 'Orders'), run: go('/admin/orders') },
      { id: 'pg-products', group: tx('صفحات', 'Pages'), label: tx('المنتجات', 'Products'), run: go('/admin/products') },
      { id: 'pg-inventory', group: tx('صفحات', 'Pages'), label: tx('المخزون والصلاحية', 'Stock & expiry'), run: go('/admin/inventory') },
      { id: 'pg-customers', group: tx('صفحات', 'Pages'), label: tx('العملاء', 'Customers'), run: go('/admin/customers') },
      { id: 'pg-segments', group: tx('صفحات', 'Pages'), label: tx('الشرائح', 'Segments'), run: go('/admin/segments') },
      { id: 'pg-analytics', group: tx('صفحات', 'Pages'), label: tx('التحليلات', 'Analytics'), run: go('/admin/analytics') },
      { id: 'pg-discounts', group: tx('صفحات', 'Pages'), label: tx('الخصومات', 'Discounts'), run: go('/admin/discounts') },
      { id: 'pg-abandoned', group: tx('صفحات', 'Pages'), label: tx('سلال متروكة', 'Abandoned carts'), run: go('/admin/abandoned') },
      { id: 'pg-reviews', group: tx('صفحات', 'Pages'), label: tx('التقييمات', 'Reviews'), run: go('/admin/reviews') },
      { id: 'pg-shipping', group: tx('صفحات', 'Pages'), label: tx('الشحن والمحافظات', 'Shipping'), run: go('/admin/shipping') },
      { id: 'pg-settings', group: tx('صفحات', 'Pages'), label: tx('الإعدادات', 'Settings'), run: go('/admin/settings') },
      { id: 'pg-live', group: tx('صفحات', 'Pages'), label: tx('مباشر الآن', 'Live view'), run: go('/admin/live') },
    ]
    const actions: Cmd[] = [
      { id: 'ac-new', group: tx('إجراءات', 'Actions'), label: tx('إضافة منتج', 'Add product'), run: go('/admin/products/new') },
      { id: 'ac-discount', group: tx('إجراءات', 'Actions'), label: tx('إنشاء خصم', 'Create discount'), run: go('/admin/discounts?new=1') },
      { id: 'ac-fulfill', group: tx('إجراءات', 'Actions'), label: tx('الطلبات اللي محتاجة تجهيز', 'Orders to fulfill'), run: go('/admin/orders?view=unfulfilled') },
      { id: 'ac-lang', group: tx('إجراءات', 'Actions'), label: tx('Switch to English', 'التحويل للعربية'), run: () => { toggle(); onClose() } },
      { id: 'ac-store', group: tx('إجراءات', 'Actions'), label: tx('افتح المتجر', 'View store'), run: go('/') },
    ]
    const match = (t: string) => !s || t.toLowerCase().includes(s)
    const out = [...pages, ...actions].filter((c) => match(c.label))
    if (s) {
      const num = s.replace(/[#\s]/g, '')
      orders
        .filter((o) => String(o.number).includes(num))
        .slice(-6)
        .reverse()
        .forEach((o) =>
          out.push({ id: o.id, group: tx('طلبات', 'Orders'), label: `#${o.number}`, hint: money(o.total), run: go(`/admin/orders/${o.id}`) }),
        )
      products
        .filter((p) => match(p.name.en) || match(p.name.ar) || match(p.brand) || match(p.sku))
        .slice(0, 6)
        .forEach((p) => out.push({ id: p.id, group: tx('منتجات', 'Products'), label: pick(p.name), hint: p.brand, run: go(`/admin/products/${p.id}`) }))
      customers
        .filter((c) => match(c.name.en) || match(c.name.ar) || c.phone.includes(s) || match(c.email))
        .slice(0, 6)
        .forEach((c) => out.push({ id: c.id, group: tx('عملاء', 'Customers'), label: pick(c.name), hint: c.phone, run: go(`/admin/customers/${c.id}`) }))
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, orders, products, customers, tx])

  useEffect(() => setSel(0), [q])

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((v) => Math.min(items.length - 1, v + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((v) => Math.max(0, v - 1))
    } else if (e.key === 'Enter') items[sel]?.run()
  }

  let lastGroup = ''
  return (
    <>
      <div className="drawer-scrim" style={{ zIndex: 90 }} onClick={onClose} />
      <div className="cmdk" role="dialog" aria-modal="true" aria-label={tx('بحث وأوامر', 'Search and commands')} onKeyDown={onKey}>
        <div className="cmdk__input">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx('رقم طلب، اسم منتج، رقم تليفون، أو أمر…', 'Order number, product, customer phone, or a command…')}
            aria-label={tx('بحث', 'Search')}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk__list" id="cmdk-list" role="listbox">
          {items.length === 0 && <div className="empty small">{tx('لا توجد نتائج. جرّب رقم الطلب أو اسم البراند.', 'No matches. Try an order number or a brand.')}</div>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup
            lastGroup = it.group
            return (
              <div key={it.id}>
                {head && <div className="cmdk__group">{it.group}</div>}
                <div className="cmdk__item" role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={it.run}>
                  {it.label}
                  {it.hint && <span className="hint">{it.hint}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
