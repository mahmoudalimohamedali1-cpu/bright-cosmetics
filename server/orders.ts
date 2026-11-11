import { buildOrder, normalizePhone, validateOrder } from '../src/lib/commerce'
import type { OrderError } from '../src/lib/commerce'
import type { Activity, Customer, Discount, Order, OrderEvent, Product, ShippingZone } from '../src/data/types'
import { db, get, getSettings, list, put, tx } from './db'

const maxNumber = db.prepare("SELECT MAX(CAST(json_extract(data, '$.number') AS INTEGER)) AS n FROM docs WHERE collection = 'orders'")
const byRequest = db.prepare("SELECT data FROM docs WHERE collection = 'orders' AND json_extract(data, '$.requestId') = ? LIMIT 1")
const byPhone = db.prepare("SELECT data FROM docs WHERE collection = 'customers' AND json_extract(data, '$.phone') = ? LIMIT 1")

/** Validate, price and store an order in one transaction. The client's prices are never trusted. */
export function createOrder(body: unknown): { ok: true; order: Order; repeat?: boolean } | { ok: false; error: OrderError } {
  const raw = (body as { requestId?: unknown } | null)?.requestId
  const requestId = typeof raw === 'string' && /^[\w-]{8,64}$/.test(raw) ? raw : undefined
  return tx(() => {
    // The same checkout sent again (its first reply was lost on the way): hand back that order, never a second one.
    if (requestId) {
      const dup = byRequest.get(requestId) as { data: string } | undefined
      if (dup) return { ok: true as const, order: JSON.parse(dup.data) as Order, repeat: true }
    }
    const products = list<Product>('products')
    const zones = list<ShippingZone>('zones')
    const discounts = list<Discount>('discounts')
    const settings = getSettings()
    const v = validateOrder(body, { products, zones, discounts, settings })
    if (!v.ok) return v

    const existing = byPhone.get(v.input.phone) as { data: string } | undefined
    const customers = existing ? [JSON.parse(existing.data) as Customer] : []
    const n = Number((maxNumber.get() as { n: number | null }).n ?? 1000)
    const built = buildOrder({ products, customers, discounts, zones, nextNumber: n + 1 }, v.input, v.cart)

    if (built.newCustomer) put('customers', built.customer.id, built.customer)
    for (const p of built.products) put('products', p.id, p)
    if (built.discount) put('discounts', built.discount.id, built.discount)
    const order: Order = requestId ? { ...built.order, requestId } : built.order
    put('orders', order.id, order)
    put('activity', built.activity.id, built.activity)
    return { ok: true as const, order }
  })
}

/** Public order lookup: the phone on the order must match. */
export function findOrderForPhone(id: string, phone: string): Order | undefined {
  const o = get<Order>('orders', id)?.doc
  if (!o) return undefined
  const c = get<Customer>('customers', o.customerId)?.doc
  if (!c || c.phone !== normalizePhone(phone)) return undefined
  return o
}

export function updateOrder(id: string, fn: (o: Order) => Order): Order | undefined {
  return tx(() => {
    const cur = get<Order>('orders', id)
    if (!cur) return undefined
    const next = fn(cur.doc)
    // Unchanged (e.g. a webhook delivered twice): no write, no new revision.
    if (next !== cur.doc) put('orders', id, next)
    return next
  })
}

export function logActivity(who: string, what: Activity['what'], link?: string) {
  const a: Activity = { id: 'a' + Math.random().toString(36).slice(2, 9), at: new Date().toISOString(), who, what, link }
  put('activity', a.id, a)
}

export const orderEvent = (type: OrderEvent['type'], by?: string, note?: string): OrderEvent => ({ at: new Date().toISOString(), type, by, note })
