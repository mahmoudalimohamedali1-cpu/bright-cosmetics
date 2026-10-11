import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { buildSeed } from '../data/seed'
import type { Db } from '../data/seed'
import type {
  Activity,
  CartLine,
  Customer,
  Discount,
  FulfillmentStatus,
  Order,
  OrderEvent,
  Product,
  Review,
  Settings,
  Shipment,
  ShippingZone,
} from '../data/types'
import { uid } from '../lib/rand'
import { buildOrder } from '../lib/commerce'
import type { CheckoutInput } from '../lib/commerce'
import { api, apiAvailable } from '../lib/api'
import { track } from '../lib/track'

/*
  One store for the storefront and the admin. Persisted to localStorage so an
  order placed in the shop shows up in the dashboard. Swap these actions for
  API calls when a backend exists; the components only see this interface.
*/


type State = Db & {
  cart: CartLine[]
  wishlist: string[]
  cartOpen: boolean
  recentlyViewed: string[]
  /** Customer id of the signed-in demo shopper (set after first checkout) */
  me?: string

  // storefront
  addToCart: (productId: string, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  setCartOpen: (v: boolean) => void
  toggleWish: (productId: string) => void
  viewed: (productId: string) => void
  placeOrder: (input: CheckoutInput) => Order
  /** Places the order on the API when one is reachable, else falls back to `placeOrder`. Rejects with ApiError. */
  submitOrder: (input: CheckoutInput) => Promise<Order>

  // admin: orders
  updateFulfillment: (orderId: string, f: FulfillmentStatus, by?: string, courier?: Order['courier']) => void
  confirmOrder: (orderId: string, via: 'whatsapp' | 'phone', by?: string) => void
  cancelOrder: (orderId: string, reason: string, by?: string) => void
  markPaid: (orderId: string, by?: string) => void
  refundOrder: (orderId: string, by?: string) => void
  addOrderNote: (orderId: string, note: string, by?: string) => void
  bulkFulfill: (orderIds: string[], f: FulfillmentStatus, by?: string, courier?: Order['courier']) => void

  // admin: catalog
  upsertProduct: (p: Product) => void
  deleteProduct: (id: string) => void
  setProductStatus: (ids: string[], s: Product['status']) => void
  adjustBatch: (productId: string, batchId: string, delta: number, reason?: string) => void
  addBatch: (productId: string, b: Product['batches'][number]) => void
  receiveShipment: (shipmentId: string) => void
  upsertShipment: (s: Shipment) => void

  // admin: customers / marketing
  upsertCustomer: (c: Customer) => void
  upsertDiscount: (d: Discount) => void
  deleteDiscount: (id: string) => void
  setReviewStatus: (id: string, s: Review['status']) => void
  replyReview: (id: string, reply: string) => void
  markRecovered: (id: string) => void
  sendReminder: (id: string) => void

  // admin: settings
  updateZone: (z: ShippingZone) => void
  updateSettings: (s: Partial<Settings>) => void
  log: (who: string, what: Activity['what'], link?: string) => void
  resetDemo: () => void
}

const now = () => new Date().toISOString()

// Pure order maths lives in lib/commerce so the API server prices orders the same way.
export { stockOf, zoneFor, evaluateCode } from '../lib/commerce'
export type { CheckoutInput } from '../lib/commerce'

function event(type: OrderEvent['type'], by?: string, note?: string): OrderEvent {
  return { at: now(), type, by, note }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...buildSeed(),
      cart: [],
      wishlist: [],
      cartOpen: false,
      recentlyViewed: [],

      addToCart: (productId, qty = 1) => {
        const p = get().products.find((x) => x.id === productId)
        track('add_to_cart', { productId, value: p ? p.price * qty : undefined })
        set((s) => {
          const ex = s.cart.find((l) => l.productId === productId)
          const cart = ex
            ? s.cart.map((l) => (l.productId === productId ? { ...l, qty: l.qty + qty } : l))
            : [...s.cart, { productId, qty }]
          return { cart, cartOpen: true }
        })
      },
      setQty: (productId, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((l) => l.productId !== productId) : s.cart.map((l) => (l.productId === productId ? { ...l, qty } : l)),
        })),
      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((l) => l.productId !== productId) })),
      clearCart: () => set({ cart: [] }),
      setCartOpen: (v) => set({ cartOpen: v }),
      toggleWish: (productId) =>
        set((s) => ({
          wishlist: s.wishlist.includes(productId) ? s.wishlist.filter((x) => x !== productId) : [...s.wishlist, productId],
        })),
      viewed: (productId) => {
        track('product_view', { productId })
        set((s) => ({ recentlyViewed: [productId, ...s.recentlyViewed.filter((x) => x !== productId)].slice(0, 12) }))
      },

      placeOrder: (input) => {
        const s = get()
        const built = buildOrder(
          { products: s.products, customers: s.customers, discounts: s.discounts, zones: s.zones, nextNumber: Math.max(1000, ...s.orders.map((o) => o.number)) + 1 },
          input,
          s.cart,
        )
        // Demo mode: no gateway, so prepaid methods are recorded as paid.
        const order: Order = input.payment === 'cod' ? built.order : { ...built.order, paymentStatus: 'paid' }
        const changed = new Map(built.products.map((p) => [p.id, p]))
        set({
          orders: [...s.orders, order],
          customers: built.newCustomer ? [built.customer, ...s.customers] : s.customers,
          products: s.products.map((p) => changed.get(p.id) ?? p),
          discounts: built.discount ? s.discounts.map((d) => (d.id === built.discount!.id ? built.discount! : d)) : s.discounts,
          cart: [],
          cartOpen: false,
          me: built.customer.id,
          activity: [built.activity, ...s.activity],
        })
        return order
      },

      submitOrder: async (input) => {
        if (!(await apiAvailable())) return get().placeOrder(input)
        const s = get()
        const order = await api<Order>('/api/orders', { body: { ...input, lines: s.cart } })
        const known = s.customers.find((c) => c.id === order.customerId)
        const customer: Customer = known
          ? { ...known, phone: input.phone }
          : {
              id: order.customerId,
              name: { ar: input.name, en: input.name },
              email: input.email ?? '',
              phone: input.phone,
              governorateId: input.governorateId,
              skinType: 'normal',
              concerns: [],
              createdAt: order.createdAt,
              tags: ['new'],
              acceptsMarketing: true,
            }
        set((st) => ({
          orders: [...st.orders.filter((o) => o.id !== order.id), order],
          customers: [customer, ...st.customers.filter((c) => c.id !== customer.id)],
          cart: [],
          cartOpen: false,
          me: customer.id,
        }))
        return order
      },

      updateFulfillment: (orderId, f, by, courier) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o
            const type = f === 'unfulfilled' ? 'note' : f
            const paymentStatus = f === 'delivered' && o.payment === 'cod' ? 'paid' : o.paymentStatus
            return {
              ...o,
              fulfillment: f,
              paymentStatus,
              status: o.status === 'open' ? 'confirmed' : o.status,
              courier: f === 'shipped' ? (courier ?? o.courier ?? 'Bosta') : o.courier,
              tracking: f === 'shipped' ? (o.tracking ?? `TRK${Math.floor(Math.random() * 1e9)}`) : o.tracking,
              events: [...o.events, event(type as OrderEvent['type'], by)],
            }
          }),
        })),
      confirmOrder: (orderId, via, by) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status: 'confirmed', events: [...o.events, event(via === 'whatsapp' ? 'whatsapp_confirmed' : 'confirmed', by)] } : o,
          ),
        })),
      cancelOrder: (orderId, reason, by) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === orderId)
          if (!o) return {}
          // Return stock to the batch it came from
          const products = s.products.map((p) => {
            const line = o.lines.find((l) => l.productId === p.id)
            if (!line) return p
            return { ...p, batches: p.batches.map((b, i) => (b.id === line.batchId || (!line.batchId && i === 0) ? { ...b, qty: b.qty + line.qty } : b)) }
          })
          return {
            products,
            orders: s.orders.map((x) =>
              x.id === orderId
                ? { ...x, status: 'cancelled', paymentStatus: x.paymentStatus === 'paid' ? 'refunded' : x.paymentStatus, events: [...x.events, event('cancelled', by, reason)] }
                : x,
            ),
          }
        }),
      markPaid: (orderId, by) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'paid', events: [...o.events, event('paid', by)] } : o)) })),
      refundOrder: (orderId, by) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'refunded', events: [...o.events, event('refunded', by)] } : o)) })),
      addOrderNote: (orderId, note, by) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === orderId ? { ...o, events: [...o.events, event('note', by, note)] } : o)) })),
      bulkFulfill: (orderIds, f, by, courier) => {
        orderIds.forEach((id) => get().updateFulfillment(id, f, by, courier))
      },

      upsertProduct: (p) =>
        set((s) => ({ products: s.products.some((x) => x.id === p.id) ? s.products.map((x) => (x.id === p.id ? p : x)) : [p, ...s.products] })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      setProductStatus: (ids, st) => set((s) => ({ products: s.products.map((p) => (ids.includes(p.id) ? { ...p, status: st } : p)) })),
      adjustBatch: (productId, batchId, delta) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === productId ? { ...p, batches: p.batches.map((b) => (b.id === batchId ? { ...b, qty: Math.max(0, b.qty + delta) } : b)) } : p,
          ),
        })),
      addBatch: (productId, b) =>
        set((s) => ({ products: s.products.map((p) => (p.id === productId ? { ...p, batches: [...p.batches, b] } : p)) })),
      receiveShipment: (shipmentId) =>
        set((s) => {
          const sh = s.shipments.find((x) => x.id === shipmentId)
          if (!sh || sh.status === 'received') return {}
          const exp = new Date(Date.now() + 540 * 86400000).toISOString().slice(0, 10)
          const products = s.products.map((p) => {
            const line = sh.lines.find((l) => l.productId === p.id)
            if (!line) return p
            return {
              ...p,
              batches: [
                ...p.batches,
                { id: uid(`${p.id}-b`), lot: `${sh.origin}${uid().toUpperCase().slice(0, 6)}`, qty: line.qty, expiry: exp, receivedAt: now(), shipmentId: sh.id },
              ],
            }
          })
          return { products, shipments: s.shipments.map((x) => (x.id === shipmentId ? { ...x, status: 'received', arrivedAt: now() } : x)) }
        }),
      upsertShipment: (sh) =>
        set((s) => ({ shipments: s.shipments.some((x) => x.id === sh.id) ? s.shipments.map((x) => (x.id === sh.id ? sh : x)) : [sh, ...s.shipments] })),

      upsertCustomer: (c) =>
        set((s) => ({ customers: s.customers.some((x) => x.id === c.id) ? s.customers.map((x) => (x.id === c.id ? c : x)) : [c, ...s.customers] })),
      upsertDiscount: (d) =>
        set((s) => ({ discounts: s.discounts.some((x) => x.id === d.id) ? s.discounts.map((x) => (x.id === d.id ? d : x)) : [d, ...s.discounts] })),
      deleteDiscount: (id) => set((s) => ({ discounts: s.discounts.filter((d) => d.id !== id) })),
      setReviewStatus: (id, st) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, status: st } : r)) })),
      replyReview: (id, reply) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) })),
      markRecovered: (id) => set((s) => ({ abandoned: s.abandoned.map((a) => (a.id === id ? { ...a, recovered: true } : a)) })),
      sendReminder: (id) => set((s) => ({ abandoned: s.abandoned.map((a) => (a.id === id ? { ...a, remindersSent: a.remindersSent + 1 } : a)) })),

      updateZone: (z) => set((s) => ({ zones: s.zones.map((x) => (x.id === z.id ? z : x)) })),
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      log: (who, what, link) => set((s) => ({ activity: [{ id: uid('a'), at: now(), who, what, link }, ...s.activity].slice(0, 200) })),
      resetDemo: () => set({ ...buildSeed(), cart: [], wishlist: [], recentlyViewed: [], me: undefined }),
    }),
    {
      name: 'nuri-store-v3',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // UI state is per visit, not saved
      partialize: ({ cartOpen: _cartOpen, ...rest }) => rest,
    },
  ),
)

/** Product lookup helper for components */
export function useProduct(id: string | undefined) {
  return useStore((s) => s.products.find((p) => p.id === id || p.slug === id))
}
