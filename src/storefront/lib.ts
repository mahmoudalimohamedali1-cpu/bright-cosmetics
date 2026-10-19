import { useI18n } from '../i18n'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { useStore, stockOf } from '../store'
import { resolveStorefront } from '../data/storefront'
import type { Batch, Category, Origin, Product } from '../data/types'

/* Storefront helpers. Only active products are ever shown to shoppers. */

export const IMPORTED_ORIGINS: Origin[] = ['FR', 'US', 'JP', 'CA', 'DE', 'CN']
export const ALL_ORIGINS: Origin[] = ['KR', ...IMPORTED_ORIGINS, 'EG']
export const CATEGORIES: Category[] = ['cleanser', 'toner', 'essence', 'serum', 'eye', 'mask', 'moisturizer', 'sunscreen', 'hair', 'makeup', 'lip']

export function useActiveProducts() {
  const products = useStore((s) => s.products)
  return useMemo(() => products.filter((p) => p.status === 'active'), [products])
}

export function useBrands() {
  const products = useActiveProducts()
  return useMemo(() => {
    const m = new Map<string, number>()
    for (const p of products) m.set(p.brand, (m.get(p.brand) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }))
  }, [products])
}

/** The lot a shopper receives today: earliest expiry that still has stock (FEFO). */
export function fefoBatch(p: Product): Batch | undefined {
  return [...p.batches].filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))[0]
}

export function fefoBatches(p: Product): Batch[] {
  return [...p.batches].filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))
}

export function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
}

export { brandSlug } from '../lib/slug'

export function inStock(p: Product) {
  return stockOf(p) > 0
}

export { PHONE_RE, normalizePhone, westernDigits } from '../lib/commerce'

export function useStorefront() {
  const settings = useStore((s) => s.settings)
  return useMemo(() => resolveStorefront(settings), [settings])
}

export function useTitle(title: string | undefined) {
  const { lang, pick } = useI18n()
  const seoTitle = useStore((s) => s.settings.storefront?.seoTitle)
  useEffect(() => {
    const brand = lang === 'ar' ? 'برايت كوزمتكس' : 'Bright Cosmetics'
    const custom = seoTitle ? pick(seoTitle).trim() : ''
    document.title = title ? `${title} | ${brand}` : custom || brand
  }, [title, lang, seoTitle, pick])
}

/** Products in a routine step that suit the given category rule. Step 5 and 6 exclude lips/makeup. */
export function stepCategoryOk(p: Product) {
  return p.category !== 'lip' && p.category !== 'makeup' && p.category !== 'hair'
}

export function useCartLines() {
  const cart = useStore((s) => s.cart)
  const products = useStore((s) => s.products)
  return useMemo(() => {
    const lines = cart
      .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId)! }))
      .filter((l) => l.product)
    const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0)
    const count = lines.reduce((s, l) => s + l.qty, 0)
    return { lines, subtotal, count }
  }, [cart, products])
}

/* Small UI store for storefront-only panels. */
type Ui = {
  quickView?: string
  setQuickView: (id?: string) => void
}

export const useUi = create<Ui>()((set) => ({
  quickView: undefined,
  setQuickView: (id) => set({ quickView: id }),
}))
