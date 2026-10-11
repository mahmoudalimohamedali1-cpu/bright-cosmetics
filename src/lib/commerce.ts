import { GOVERNORATES } from '../data/seed'
import type {
  Activity,
  CartLine,
  Customer,
  Discount,
  Order,
  OrderEvent,
  PaymentMethod,
  Product,
  Settings,
  ShippingZone,
} from '../data/types'
import { uid } from './rand'
import type { Bi } from '../i18n'

/*
  Pure order maths shared by the browser store (offline / demo mode) and the
  API server (authoritative). No I/O, no globals: callers pass the current
  records in and apply the returned changes themselves.
*/

export type CheckoutInput = {
  name: string
  phone: string
  email?: string
  governorateId: string
  address: string
  payment: PaymentMethod
  code?: string
  note?: string
}

export const PAYMENT_METHODS: PaymentMethod[] = ['cod', 'card', 'wallet', 'instapay']
export const PHONE_RE = /^01[0125]\d{8}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Convert Arabic-Indic and Persian digits to Western digits. */
export function westernDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

export function normalizePhone(s: string) {
  return westernDigits(s).replace(/[\s-]/g, '').replace(/^\+?20(?=1)/, '0')
}

export function stockOf(p: Product) {
  return p.batches.reduce((s, b) => s + b.qty, 0)
}

export function zoneFor(governorateId: string, zones: ShippingZone[]) {
  const g = GOVERNORATES.find((x) => x.id === governorateId)
  return zones.find((z) => z.id === (g?.zone ?? 'cairo'))!
}

export type CodeResult =
  | { discount: number; freeShipping: boolean; valid: false }
  | { discount: number; freeShipping: boolean; valid: true; d: Discount }

/** Discount amount for a subtotal, given an entered code. */
export function evaluateCode(code: string | undefined, subtotal: number, discounts: Discount[]): CodeResult {
  if (!code) return { discount: 0, freeShipping: false, valid: false }
  const d = discounts.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.active && !x.automatic)
  if (!d || subtotal < d.minSubtotal) return { discount: 0, freeShipping: false, valid: false }
  if (d.kind === 'percent') return { discount: Math.round((subtotal * d.value) / 100), freeShipping: false, valid: true, d }
  if (d.kind === 'fixed') return { discount: Math.min(subtotal, d.value), freeShipping: false, valid: true, d }
  if (d.kind === 'free_shipping') return { discount: 0, freeShipping: true, valid: true, d }
  return { discount: 0, freeShipping: false, valid: false }
}

/** Remove qty from batches, earliest expiry first (FEFO). Returns the batch used for the first unit. */
export function consumeFEFO(p: Product, qty: number): { product: Product; batchId?: string } {
  const batches = [...p.batches].sort((a, b) => a.expiry.localeCompare(b.expiry)).map((b) => ({ ...b }))
  let left = qty
  let first: string | undefined
  for (const b of batches) {
    if (left <= 0) break
    if (b.qty <= 0) continue
    const take = Math.min(b.qty, left)
    b.qty -= take
    left -= take
    first ??= b.id
  }
  return { product: { ...p, batches }, batchId: first }
}

/** Merge duplicate product lines and drop non-positive quantities. */
export function mergeLines(lines: CartLine[]): CartLine[] {
  const m = new Map<string, number>()
  for (const l of lines) if (l.qty > 0) m.set(l.productId, (m.get(l.productId) ?? 0) + l.qty)
  return [...m.entries()].map(([productId, qty]) => ({ productId, qty }))
}

export type OrderContext = {
  products: Product[]
  customers: Customer[]
  discounts: Discount[]
  zones: ShippingZone[]
  nextNumber: number
  now?: string
}

export type BuiltOrder = {
  order: Order
  customer: Customer
  newCustomer: boolean
  /** Only the products whose batches changed */
  products: Product[]
  /** The discount with its use counted, when a code was applied */
  discount?: Discount
  activity: Activity
}

/** Build an order from cart lines. Assumes inputs were validated (see validateOrder). */
export function buildOrder(ctx: OrderContext, input: CheckoutInput, cart: CartLine[]): BuiltOrder {
  const now = ctx.now ?? new Date().toISOString()
  let customer = ctx.customers.find((c) => c.phone === input.phone)
  const newCustomer = !customer
  if (!customer) {
    customer = {
      id: uid('c'),
      name: { ar: input.name, en: input.name },
      email: input.email ?? '',
      phone: input.phone,
      governorateId: input.governorateId,
      skinType: 'normal',
      concerns: [],
      createdAt: now,
      tags: ['new'],
      acceptsMarketing: true,
    }
  }
  const changed = new Map<string, Product>()
  const lines = mergeLines(cart).map((l) => {
    const p = changed.get(l.productId) ?? ctx.products.find((x) => x.id === l.productId)!
    const { product, batchId } = consumeFEFO(p, l.qty)
    changed.set(p.id, product)
    return { productId: p.id, qty: l.qty, price: p.price, cost: p.cost, batchId }
  })
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
  const zone = zoneFor(input.governorateId, ctx.zones)
  const code = evaluateCode(input.code, subtotal, ctx.discounts)
  const shipping = code.freeShipping || subtotal >= zone.freeOver ? 0 : zone.rate
  const codFee = input.payment === 'cod' ? zone.codFee : 0
  const number = ctx.nextNumber
  const event: OrderEvent = { at: now, type: 'placed' }
  const order: Order = {
    id: `o${number}`,
    number,
    customerId: customer.id,
    createdAt: now,
    lines,
    subtotal,
    discount: code.discount,
    discountCode: code.valid ? input.code?.trim().toUpperCase() : undefined,
    shipping,
    codFee,
    total: subtotal - code.discount + shipping + codFee,
    payment: input.payment,
    paymentStatus: 'pending',
    fulfillment: 'unfulfilled',
    status: 'open',
    governorateId: input.governorateId,
    address: input.address,
    channel: 'web',
    events: [event],
    note: input.note,
    tags: ['new'],
    risk: input.payment === 'cod' && subtotal > 3500 ? 'medium' : 'low',
  }
  return {
    order,
    customer,
    newCustomer,
    products: [...changed.values()],
    discount: code.valid ? { ...code.d, used: code.d.used + 1 } : undefined,
    activity: {
      id: uid('a'),
      at: now,
      who: customer.name.en,
      what: { ar: `طلب جديد #${number} من المتجر`, en: `New order #${number} from the store` },
      link: `/admin/orders/${order.id}`,
    },
  }
}

export type OrderError = { code: string; message: Bi; field?: string }

const err = (code: string, ar: string, en: string, field?: string): OrderError => ({ code, message: { ar, en }, field })

/**
 * Server-side validation of a raw checkout body. Returns either a cleaned input
 * and cart, or the first error found (bilingual, storefront voice).
 */
export function validateOrder(
  body: unknown,
  ctx: { products: Product[]; zones: ShippingZone[]; discounts: Discount[]; settings: Settings },
): { ok: true; input: CheckoutInput; cart: CartLine[] } | { ok: false; error: OrderError } {
  const b = (body ?? {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  if (!Array.isArray(b.lines) || b.lines.length === 0 || b.lines.length > 50)
    return { ok: false, error: err('empty_cart', 'سلتك فاضية.', 'Your bag is empty.') }
  const raw: CartLine[] = []
  for (const l of b.lines as unknown[]) {
    const x = (l ?? {}) as Record<string, unknown>
    const qty = Number(x.qty)
    if (typeof x.productId !== 'string' || !Number.isInteger(qty) || qty < 1 || qty > 99)
      return { ok: false, error: err('bad_line', 'في منتج في السلة مش مظبوط.', 'A line in your bag is not valid.') }
    raw.push({ productId: x.productId, qty })
  }
  const cart = mergeLines(raw)

  const name = str(b.name, 80)
  if (name.length < 2) return { ok: false, error: err('bad_name', 'اكتبي اسمك عشان المندوب يعرف يسلّمك.', 'Enter your name so the courier knows who to hand it to.', 'name') }
  const phone = normalizePhone(str(b.phone, 30))
  if (!PHONE_RE.test(phone))
    return {
      ok: false,
      error: err('bad_phone', 'الرقم لازم يكون موبايل مصري من ١١ رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.', 'Use an 11-digit Egyptian mobile starting with 010, 011, 012 or 015.', 'phone'),
    }
  const email = str(b.email, 120)
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: err('bad_email', 'الإيميل مش مكتوب صح.', 'This email address does not look right.', 'email') }
  const governorateId = str(b.governorateId, 10)
  const gov = GOVERNORATES.find((g) => g.id === governorateId)
  if (!gov) return { ok: false, error: err('bad_governorate', 'اختاري المحافظة عشان نحسب الشحن.', 'Choose your governorate so we can price delivery.', 'gov') }
  const zone = zoneFor(governorateId, ctx.zones)
  if (!zone || !zone.enabled)
    return { ok: false, error: err('zone_disabled', 'للأسف مش بنوصّل للمحافظة دي دلوقتي.', 'Sorry, we do not deliver to this governorate right now.', 'gov') }
  const address = str(b.address, 300)
  if (address.length < 8) return { ok: false, error: err('bad_address', 'اكتبي العنوان بالتفصيل: الحي، الشارع، رقم العمارة والشقة.', 'Enter the full address: area, street, building and flat.', 'address') }
  const payment = b.payment as PaymentMethod
  if (!PAYMENT_METHODS.includes(payment)) return { ok: false, error: err('bad_payment', 'اختاري طريقة الدفع.', 'Choose a payment method.') }
  const code = str(b.code, 40) || undefined
  const note = str(b.note, 500) || undefined

  for (const l of cart) {
    const p = ctx.products.find((x) => x.id === l.productId)
    if (!p || p.status !== 'active')
      return { ok: false, error: err('unavailable', 'في منتج في سلتك مبقاش متاح. شيليه وكمّلي.', 'A product in your bag is no longer available. Remove it and try again.') }
    const left = stockOf(p)
    if (left < l.qty)
      return {
        ok: false,
        error: err(
          'out_of_stock',
          left > 0 ? `فاضل ${left} بس من ${p.name.ar}. قلّلي الكمية وكمّلي.` : `${p.name.ar} خلص من المخزون.`,
          left > 0 ? `Only ${left} left of ${p.name.en}. Lower the quantity and try again.` : `${p.name.en} is out of stock.`,
        ),
      }
  }

  if (payment === 'cod') {
    const subtotal = cart.reduce((s, l) => s + ctx.products.find((p) => p.id === l.productId)!.price * l.qty, 0)
    const ev = evaluateCode(code, subtotal, ctx.discounts)
    const shipping = ev.freeShipping || subtotal >= zone.freeOver ? 0 : zone.rate
    const total = subtotal - ev.discount + shipping + zone.codFee
    if (!ctx.settings.codEnabled || total > ctx.settings.codMax)
      return {
        ok: false,
        error: err('cod_unavailable', `الدفع عند الاستلام متاح للطلبات لحد ${ctx.settings.codMax} ج.م. اختاري طريقة دفع تانية.`, `Cash on delivery is available for orders up to EGP ${ctx.settings.codMax}. Choose another payment method.`),
      }
  }

  return { ok: true, input: { name, phone, email: email || undefined, governorateId, address, payment, code, note }, cart }
}
