import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import StoreLayout from './storefront/StoreLayout'
import Home from './storefront/pages/Home'
import Shop from './storefront/pages/Shop'
import ProductPage from './storefront/pages/ProductPage'
import Checkout from './storefront/pages/Checkout'
import OrderConfirmation from './storefront/pages/OrderConfirmation'
import Wishlist from './storefront/pages/Wishlist'
import Routine from './storefront/pages/Routine'
import Account from './storefront/pages/Account'
import NotFound from './storefront/pages/NotFound'
import InfoPage from './storefront/pages/InfoPage'
import DraftPreview from './storefront/pages/DraftPreview'
import { Framed } from './storefront/components/PageFrame'

// The admin is its own bundle: shoppers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--lacquer-900)' }} />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Framed id="shop"><Shop /></Framed>} />
        <Route path="shop/:category" element={<Framed id="shop"><Shop /></Framed>} />
        <Route path="brand/:brand" element={<Framed id="shop"><Shop /></Framed>} />
        <Route path="search" element={<Framed id="shop"><Shop /></Framed>} />
        <Route path="p/:slug" element={<Framed id="product"><ProductPage /></Framed>} />
        <Route path="checkout" element={<Framed id="checkout"><Checkout /></Framed>} />
        <Route path="order/:id" element={<OrderConfirmation />} />
        <Route path="wishlist" element={<Framed id="wishlist"><Wishlist /></Framed>} />
        <Route path="routine" element={<Framed id="routine"><Routine /></Framed>} />
        <Route path="account" element={<Framed id="account"><Account /></Framed>} />
        <Route path="info/:slug" element={<InfoPage />} />
        <Route path="preview" element={<DraftPreview />} />
        <Route path="*" element={<Framed id="missing"><NotFound /></Framed>} />
      </Route>
    </Routes>
  )
}
