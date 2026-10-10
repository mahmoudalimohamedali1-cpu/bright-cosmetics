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
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:category" element={<Shop />} />
        <Route path="brand/:brand" element={<Shop />} />
        <Route path="search" element={<Shop />} />
        <Route path="p/:slug" element={<ProductPage />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order/:id" element={<OrderConfirmation />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="routine" element={<Routine />} />
        <Route path="account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
