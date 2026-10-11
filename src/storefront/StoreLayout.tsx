import { useEffect, useLayoutEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { useUi } from './lib'
import { loadPublic } from '../lib/sync'
import { track } from '../lib/track'
import { CartDrawer } from './components/CartDrawer'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { QuickView } from './components/QuickView'
import './store.css'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Panels never survive a page change (cartOpen is persisted with the store).
    useStore.getState().setCartOpen(false)
    useUi.getState().setQuickView(undefined)
    track('view')
  }, [pathname])
  return null
}

export default function StoreLayout() {
  const { tx, dir, lang } = useI18n()
  // With an API, the catalogue, zones, settings and reviews come from the server.
  useEffect(() => {
    void loadPublic()
  }, [])
  // Set direction before first paint so a stored English preference never flashes RTL.
  useLayoutEffect(() => {
    document.documentElement.dir = dir
    document.documentElement.lang = lang
  }, [dir, lang])
  return (
    <div className="sf">
      <a href="#sf-main" className="sf-skip">
        {tx('انتقلي للمحتوى', 'Skip to content')}
      </a>
      <ScrollToTop />
      <Header />
      <main id="sf-main" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <QuickView />
    </div>
  )
}
