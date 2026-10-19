import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { createMiddleware } from 'hono/factory'
import type { Customer, Discount, Order, OrderEvent, Product, Review, Settings, Shipment, ShippingZone, Staff } from '../src/data/types'
import { canCancel, canReturn, cancelOrderDoc, normalizePhone, PHONE_RE, restockLines, returnOrderDoc } from '../src/lib/commerce'
import { changedKeys, isRole, PERMISSION_LABEL, writePermission } from '../src/lib/permissions'
import { sanitizeStorefront } from '../src/data/storefront'
import { brandSlug } from '../src/lib/slug'
import type { Permission } from '../src/lib/permissions'
import { EVENT_TYPES, funnelStats, liveStats, recordEvent } from './analytics'
import type { EventType } from './analytics'
import {
  activeOwners,
  allAuth,
  audit,
  authByEmail,
  authById,
  checkLogin,
  createLogin,
  deleteLogin,
  endSession,
  endSessions,
  generatePassword,
  keepStaff,
  MIN_PASSWORD,
  recentAudit,
  sessionStaff,
  setDisabled,
  setLoginEmail,
  setPassword,
  startSession,
  touch,
} from './auth'
import type { Me } from './auth'
import { bootstrap, db, get, getSettings, isCollection, list, put, remove, revsOf, seed, tx } from './db'
import type { DocCollection } from './db'
import { configured, env } from './env'
import { clientIp, fail, limiter, notConfigured, ProviderError, readJson } from './http'
import { BOSTA_VARS, createDelivery } from './integrations/bosta'
import { createIntention, orderIdFrom, PAYMOB_VARS, verifyHmac } from './integrations/paymob'
import type { PaymobTxn } from './integrations/paymob'
import { sendText, WHATSAPP_VARS } from './integrations/whatsapp'
import { createOrder, findOrderForPhone, logActivity, orderEvent, updateOrder } from './orders'

type AppEnv = { Variables: { me: Me } }

export const app = new Hono<AppEnv>()

app.use('/api/*', bodyLimit({ maxSize: 8 * 1024 * 1024, onError: (c) => fail(c, 413, 'too_large', { ar: 'الطلب كبير جدًا.', en: 'Request body too large.' }) }))
app.use('/api/*', async (c, next) => {
  await next()
  c.header('cache-control', 'no-store')
})

app.onError((e, c) => {
  console.error('[api]', e)
  return fail(c, 500, 'server_error', { ar: 'حصلت مشكلة في السيرفر. جرّبي تاني بعد شوية.', en: 'Something went wrong on the server. Please try again shortly.' })
})

const appUrl = (c: Context) => {
  if (env.appUrl) return env.appUrl.replace(/\/$/, '')
  const proto = c.req.header('x-forwarded-proto') ?? new URL(c.req.url).protocol.replace(':', '')
  const host = c.req.header('x-forwarded-host') ?? c.req.header('host') ?? new URL(c.req.url).host
  return `${proto}://${host}`
}

const providerFail = (c: Context, name: string, e: unknown) => {
  if (e instanceof ProviderError) {
    console.error(`[${name}]`, e.status, JSON.stringify(e.detail)?.slice(0, 500))
    return fail(c, 502, 'provider_error', { ar: `${name} رفض الطلب (${e.status}).`, en: `${name} rejected the request (${e.status}).` }, { providerStatus: e.status })
  }
  throw e
}

/* ───────────── Public ───────────── */

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }))

/** Shopper-safe projections: no landed cost, no freight/customs, no customer contact data. */
const publicProduct = (p: Product): Product => ({ ...p, cost: 0 })
const publicShipment = (s: Shipment): Shipment => ({ id: s.id, supplier: s.supplier, origin: s.origin, createdAt: s.createdAt, arrivedAt: s.arrivedAt, status: s.status, freight: 0, customs: 0, lines: [] })
const publicDiscount = (d: Discount): Discount => ({ id: d.id, code: d.code, title: d.title, kind: d.kind, value: d.value, minSubtotal: d.minSubtotal, used: 0, startsAt: d.startsAt, endsAt: d.endsAt, active: d.active, automatic: d.automatic, appliesTo: d.appliesTo, target: d.target })
/** Orders as shoppers see them: landed cost per line stays private. */
/** What a shopper may see of an order: no costs, internal notes, staff names, tags or risk flags. */
const publicOrder = (o: Order): Order => ({
  ...o,
  lines: o.lines.map((l) => ({ ...l, cost: 0 })),
  events: o.events.filter((e) => e.type !== 'note').map(({ at, type }) => ({ at, type })),
  tags: [],
  risk: 'low',
})
const initialName = (full: string) => {
  const [first, last] = full.split(' ')
  return last ? `${first} ${last[0]}.` : first
}

/** Stars on a product come only from its published customer reviews. */
function withRatings(products: Product[], reviews: Review[]) {
  const by = new Map<string, number[]>()
  for (const r of reviews) by.set(r.productId, [...(by.get(r.productId) ?? []), r.rating])
  return products.map((p) => {
    const rs = by.get(p.id) ?? []
    return { ...p, reviewCount: rs.length, rating: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 : 0 }
  })
}

app.get('/api/public', (c) => {
  const reviews = list<Review>('reviews').filter((r) => r.status === 'published')
  const products = withRatings(list<Product>('products').filter((p) => p.status === 'active'), reviews)
  const ids = new Set(reviews.map((r) => r.customerId))
  const reviewers: Customer[] = list<Customer>('customers')
    .filter((x) => ids.has(x.id))
    .map((x) => ({ id: x.id, name: { ar: initialName(x.name.ar), en: initialName(x.name.en) }, email: '', phone: '', governorateId: x.governorateId, skinType: x.skinType, concerns: [], createdAt: x.createdAt, tags: [], acceptsMarketing: false }))
  const offers = list<Discount>('discounts').filter((d) => d.automatic && d.active).map(publicDiscount)
  return c.json({
    products: products.map(publicProduct),
    zones: list<ShippingZone>('zones'),
    settings: getSettings(),
    reviews,
    offers,
    reviewers,
    shipments: list<Shipment>('shipments').map(publicShipment),
    payments: { paymob: configured.paymob() },
  })
})

const codeLimit = limiter(30, 10 * 60_000)
app.post('/api/public/code', async (c) => {
  if (!codeLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'محاولات كتير. استني شوية.', en: 'Too many attempts. Please wait a bit.' })
  const b = (await readJson(c)) as { code?: unknown } | undefined
  const code = typeof b?.code === 'string' ? b.code.trim().toUpperCase().slice(0, 40) : ''
  const d = code ? list<Discount>('discounts').find((x) => x.code.toUpperCase() === code && x.active && !x.automatic) : undefined
  return c.json({ discount: d ? publicDiscount(d) : null })
})

const orderLimit = limiter(20, 10 * 60_000)
app.post('/api/orders', async (c) => {
  if (!orderLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'طلبات كتير من نفس الجهاز. استني شوية وجرّبي تاني.', en: 'Too many orders from this device. Please wait and try again.' })
  const body = await readJson(c)
  if (!body || typeof body !== 'object') return fail(c, 400, 'bad_request', { ar: 'البيانات مش مكتملة.', en: 'The request body is missing or not JSON.' })
  const r = createOrder(body)
  if (!r.ok) return fail(c, r.error.code === 'out_of_stock' || r.error.code === 'unavailable' ? 409 : 400, r.error.code, r.error.message, r.error.field ? { field: r.error.field } : undefined)
  return c.json(publicOrder(r.order), 201)
})

const lookupLimit = limiter(60, 10 * 60_000)
app.get('/api/orders/:id', (c) => {
  if (!lookupLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'محاولات كتير. استني شوية.', en: 'Too many attempts. Please wait a bit.' })
  const o = findOrderForPhone(c.req.param('id'), c.req.query('phone') ?? '')
  if (!o) return fail(c, 404, 'not_found', { ar: 'مش لاقيين طلب بالرقم ده والموبايل ده.', en: 'No order matches this number and mobile.' })
  return c.json(publicOrder(o))
})

/**
 * A shopper's order history. Proof of ownership is the mobile plus the number of
 * any one of their orders, so knowing a phone number alone shows nothing.
 */
app.get('/api/orders-history', (c) => {
  if (!lookupLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'محاولات كتير. استني شوية.', en: 'Too many attempts. Please wait a bit.' })
  const phone = normalizePhone(c.req.query('phone') ?? '')
  const number = Number(String(c.req.query('order') ?? '').replace(/\D/g, ''))
  const none = () => fail(c, 404, 'not_found', { ar: 'مش لاقيين طلب بالرقم ده والموبايل ده.', en: 'No order matches this number and mobile.' })
  if (!PHONE_RE.test(phone) || !number) return none()
  const proof = findOrderForPhone(`o${number}`, phone)
  if (!proof) return none()
  const orders = list<Order>('orders')
    .filter((o) => o.customerId === proof.customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map(publicOrder)
  return c.json({ orders })
})

/* ───────────── Search engines ───────────── */

// Private or per-visitor pages stay out of search results.
const NO_INDEX = ['/admin', '/api/', '/checkout', '/account', '/wishlist', '/order/', '/preview', '/search']

app.get('/robots.txt', (c) => {
  const origin = appUrl(c)
  const lines = ['User-agent: *', 'Allow: /', ...NO_INDEX.map((p) => `Disallow: ${p}`), '', `Sitemap: ${origin}/sitemap.xml`, '']
  c.header('cache-control', 'public, max-age=3600')
  return c.text(lines.join('\n'))
})

app.get('/sitemap.xml', (c) => {
  const origin = appUrl(c)
  const products = list<Product>('products').filter((p) => p.status === 'active')
  const cats = [...new Set(products.map((p) => p.category))]
  const brands = [...new Set(products.map((p) => brandSlug(p.brand)))].filter(Boolean)
  const settings = getSettings()
  const pages = settings.storefront ? sanitizeStorefront(settings.storefront).pages.filter((p) => p.published) : []
  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    ...cats.map((cat) => ({ loc: `/shop/${cat}`, priority: '0.8', changefreq: 'weekly' })),
    ...brands.map((b) => ({ loc: `/brand/${b}`, priority: '0.7', changefreq: 'weekly' })),
    ...products.map((p) => ({ loc: `/p/${p.slug}`, priority: '0.8', changefreq: 'weekly' })),
    { loc: '/routine', priority: '0.6', changefreq: 'monthly' },
    ...pages.map((p) => ({ loc: `/info/${p.slug}`, priority: '0.5', changefreq: 'monthly' })),
  ]
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(origin + u.loc)}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n') +
    '\n</urlset>\n'
  c.header('cache-control', 'public, max-age=3600')
  return c.body(xml, 200, { 'content-type': 'application/xml; charset=utf-8' })
})

/* ───────────── Reviews from shoppers ───────────── */

const reviewLimit = limiter(5, 60 * 60_000)
app.post('/api/reviews', async (c) => {
  if (!reviewLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'تقييمات كتير من نفس الجهاز. جرّبي بعد شوية.', en: 'Too many reviews from this device. Please try later.' })
  const b = (await readJson(c)) as Record<string, unknown> | undefined
  const productId = typeof b?.productId === 'string' ? b.productId : ''
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 60) : ''
  const phone = normalizePhone(typeof b?.phone === 'string' ? b.phone : '')
  const rating = typeof b?.rating === 'number' ? Math.round(b.rating) : 0
  const body = typeof b?.body === 'string' ? b.body.trim().slice(0, 1200) : ''
  const title = typeof b?.title === 'string' ? b.title.trim().slice(0, 120) : ''
  const lang = b?.lang === 'en' ? 'en' : 'ar'
  const product = get<Product>('products', productId)?.doc
  if (!product || product.status !== 'active') return fail(c, 404, 'not_found', { ar: 'المنتج مش موجود.', en: 'Product not found.' })
  if (!name) return fail(c, 400, 'bad_name', { ar: 'اكتبي اسمك.', en: 'Please add your name.' }, { field: 'name' })
  if (!PHONE_RE.test(phone)) return fail(c, 400, 'bad_phone', { ar: 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.', en: 'Mobile must be 11 digits starting 010, 011, 012 or 015.' }, { field: 'phone' })
  if (rating < 1 || rating > 5) return fail(c, 400, 'bad_rating', { ar: 'اختاري عدد النجوم.', en: 'Choose a star rating.' }, { field: 'rating' })
  if (body.length < 10) return fail(c, 400, 'bad_body', { ar: 'اكتبي رأيك في سطر على الأقل (10 حروف).', en: 'Write at least a line (10 characters).' }, { field: 'body' })

  const review = tx(() => {
    let customer = list<Customer>('customers').find((x) => normalizePhone(x.phone) === phone)
    if (!customer) {
      customer = {
        id: 'c' + randomBytes(5).toString('hex'),
        name: { ar: name, en: name },
        email: '',
        phone,
        governorateId: 'cai',
        skinType: 'normal',
        concerns: [],
        createdAt: new Date().toISOString(),
        tags: ['reviewer'],
        acceptsMarketing: false,
      }
      put('customers', customer.id, customer)
    }
    const cid = customer.id
    // "Verified purchase" only when this mobile actually received the product
    const verified = list<Order>('orders').some(
      (o) => o.customerId === cid && o.fulfillment === 'delivered' && o.lines.some((l) => l.productId === product.id),
    )
    const r: Review = {
      id: 'rv' + randomBytes(5).toString('hex'),
      productId: product.id,
      customerId: cid,
      rating,
      title,
      body,
      lang,
      createdAt: new Date().toISOString(),
      status: 'pending',
      skinType: customer.skinType,
      verified,
    }
    put('reviews', r.id, r)
    logActivity(name, { ar: `تقييم جديد على ${product.name.ar} محتاج مراجعة`, en: `New review on ${product.name.en} awaiting moderation` }, '/admin/reviews')
    return r
  })
  return c.json({ id: review.id, status: review.status, verified: review.verified }, 201)
})

/* ───────────── Events ───────────── */

const perSession = limiter(120, 60_000)
const perIp = limiter(600, 60_000)
app.post('/api/events', async (c) => {
  const b = (await readJson(c)) as Record<string, unknown> | undefined
  const session = typeof b?.session === 'string' ? b.session.slice(0, 64) : ''
  const type = b?.type as EventType
  if (!session || !/^[\w-]{8,64}$/.test(session) || !EVENT_TYPES.includes(type)) return fail(c, 400, 'bad_event', { ar: 'حدث غير صالح.', en: 'Invalid event.' })
  if (!perSession(session) || !perIp(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'أحداث كتير.', en: 'Too many events.' })
  const meta: Record<string, string> = {}
  if (b?.meta && typeof b.meta === 'object')
    for (const [k, v] of Object.entries(b.meta as Record<string, unknown>)) if ((k === 'ref' || k === 'utm') && typeof v === 'string') meta[k] = v.slice(0, 80)
  recordEvent({
    session,
    type,
    path: typeof b?.path === 'string' ? b.path.slice(0, 200) : undefined,
    productId: typeof b?.productId === 'string' ? b.productId.slice(0, 64) : undefined,
    value: typeof b?.value === 'number' && Number.isFinite(b.value) ? Math.max(0, Math.min(1e7, b.value)) : undefined,
    meta,
  })
  return c.body(null, 204)
})

/* ───────────── Payments: Paymob ───────────── */

app.post('/api/payments/paymob/intention', async (c) => {
  if (!configured.paymob()) return notConfigured(c, 'Paymob', PAYMOB_VARS)
  const b = (await readJson(c)) as { orderId?: unknown; phone?: unknown } | undefined
  const o = findOrderForPhone(String(b?.orderId ?? ''), String(b?.phone ?? ''))
  if (!o) return fail(c, 404, 'not_found', { ar: 'مش لاقيين الطلب ده.', en: 'Order not found.' })
  if (o.payment !== 'card' && o.payment !== 'wallet') return fail(c, 400, 'not_online', { ar: 'الطلب ده مش بالدفع الإلكتروني.', en: 'This order is not an online payment.' })
  if (o.paymentStatus !== 'pending' || o.status === 'cancelled') return fail(c, 409, 'not_payable', { ar: 'الطلب ده مش محتاج دفع.', en: 'This order cannot be paid now.' })
  const customer = get<Customer>('customers', o.customerId)!.doc
  try {
    const r = await createIntention(o, customer, { method: o.payment, appUrl: appUrl(c), fallbackEmail: getSettings().email })
    return c.json({ url: r.url })
  } catch (e) {
    return providerFail(c, 'Paymob', e)
  }
})

app.post('/api/payments/paymob/webhook', async (c) => {
  if (!configured.paymob()) return notConfigured(c, 'Paymob', PAYMOB_VARS)
  const b = (await readJson(c)) as { type?: string; obj?: PaymobTxn } | undefined
  if (!b?.obj || !verifyHmac(b.obj, c.req.query('hmac'))) return fail(c, 401, 'bad_signature', { ar: 'توقيع غير صالح.', en: 'Invalid HMAC signature.' })
  if (b.type && b.type !== 'TRANSACTION') return c.json({ ok: true, ignored: b.type })
  const t = b.obj
  const id = orderIdFrom(t)
  if (!id) return c.json({ ok: true, ignored: 'no_reference' })
  if (t.success === true && t.pending === false) {
    const updated = updateOrder(id, (o) => {
      if (o.paymentStatus === 'paid' || Math.round(o.total * 100) !== Number(t.amount_cents)) return o
      return { ...o, paymentStatus: 'paid', events: [...o.events, orderEvent('paid', 'Paymob', `Transaction ${t.id}`)] }
    })
    if (updated?.paymentStatus === 'paid') logActivity('Paymob', { ar: `اتدفع طلب #${updated.number} أونلاين`, en: `Order #${updated.number} paid online` }, `/admin/orders/${id}`)
  } else if (t.success === false && t.pending === false) {
    updateOrder(id, (o) => (o.paymentStatus === 'pending' ? { ...o, events: [...o.events, orderEvent('note', 'Paymob', `Payment failed (transaction ${t.id})`)] } : o))
  }
  return c.json({ ok: true })
})

/* ───────────── Admin auth ───────────── */

const loginLimit = limiter(10, 15 * 60_000)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

app.post('/api/admin/login', async (c) => {
  if (!allAuth().length) return fail(c, 503, 'admin_not_configured', { ar: 'مفيش حساب أدمن على السيرفر. لازم ضبط ADMIN_PASSWORD (و ADMIN_EMAIL) وإعادة تشغيل السيرفر.', en: 'No admin account exists yet. Set ADMIN_PASSWORD (and ADMIN_EMAIL) and restart the server.' })
  if (!loginLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'محاولات كتير. الانتظار ربع ساعة مطلوب.', en: 'Too many attempts. Wait 15 minutes.' })
  const b = (await readJson(c)) as { email?: unknown; password?: unknown } | undefined
  const email = typeof b?.email === 'string' ? b.email.trim().slice(0, 120) : ''
  const pw = typeof b?.password === 'string' ? b.password.slice(0, 200) : ''
  if (!email || !pw) return fail(c, 400, 'missing_credentials', { ar: 'البريد وكلمة السر مطلوبين.', en: 'Email and password are required.' })
  const r = await checkLogin(email, pw)
  if (!r.ok && r.disabled) return fail(c, 403, 'account_disabled', { ar: 'الحساب ده متوقف. التواصل مع المالك مطلوب.', en: 'This account is disabled. Contact the store owner.' })
  if (!r.ok) return fail(c, 401, 'bad_credentials', { ar: 'البريد أو كلمة السر مش صحيحين.', en: 'Wrong email or password.' })
  const token = startSession(r.auth.staff_id)
  touch(r.auth.staff_id)
  const me = sessionStaff(token)
  return c.json({ token, me })
})

const bearer = (c: Context) => c.req.header('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]

const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.req.path === '/api/admin/login') return next()
  const me = sessionStaff(bearer(c))
  if (!me) return fail(c, 401, 'unauthorized', { ar: 'لازم تسجيل الدخول.', en: 'Sign in required.' })
  c.set('me', me)
  touch(me.id)
  return next()
})
app.use('/api/admin/*', requireAdmin)

const forbidden = (c: Context, p: Permission | null, extra?: Record<string, unknown>) => {
  const label = p ? PERMISSION_LABEL[p] : { ar: 'تعديل الفريق من هنا', en: 'editing staff this way' }
  return fail(c, 403, 'forbidden', { ar: `مش متاح لدورك: ${label.ar}.`, en: `Not available for your role: ${label.en}.` }, { permission: p, ...extra })
}

/** Route guard: the signed-in staff member needs at least one of these permissions. */
const need = (...perms: Permission[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const me = c.get('me')
    if (!perms.some((p) => me.permissions.includes(p))) return forbidden(c, perms[0])
    return next()
  })

const allowed = (me: Me, p: Permission | 'signed-in' | null) => p === 'signed-in' || (p !== null && me.permissions.includes(p))

app.post('/api/admin/logout', (c) => {
  endSession(bearer(c) ?? '')
  return c.json({ ok: true })
})

app.get('/api/admin/me', (c) => {
  const me = c.get('me')
  const doc = get<Staff>('staff', me.id)!.doc
  return c.json({ staff: { ...doc, email: me.email }, permissions: me.permissions })
})

/* ───────────── Staff accounts (staff.manage) ───────────── */

type StaffRow = Staff & { login: boolean; disabled: boolean }
const staffRow = (s: Staff, auth = authById(s.id)): StaffRow => ({ ...s, email: auth?.email ?? s.email, login: !!auth, disabled: !!auth?.disabled })
const LAST_OWNER = { ar: 'لازم يفضل مالك واحد على الأقل يقدر يدخل.', en: 'At least one owner must keep a working sign-in.' }
const SHORT_PW = { ar: `كلمة السر لازم تكون ${MIN_PASSWORD} حروف على الأقل.`, en: `Passwords need at least ${MIN_PASSWORD} characters.` }
const EMAIL_TAKEN = { ar: 'البريد ده مستخدم لحساب تاني.', en: 'That email already has an account.' }

app.get('/api/admin/staff', need('staff.manage'), (c) => {
  const auth = new Map(allAuth().map((a) => [a.staff_id, a]))
  return c.json({ staff: list<Staff>('staff').map((s) => staffRow(s, auth.get(s.id))), revs: revsOf('staff') })
})

app.post('/api/admin/staff', need('staff.manage'), async (c) => {
  const me = c.get('me')
  const b = (await readJson(c)) as { name?: unknown; email?: unknown; role?: unknown; password?: unknown } | undefined
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 60) : ''
  const email = typeof b?.email === 'string' ? b.email.trim().toLowerCase().slice(0, 120) : ''
  const role = b?.role
  const given = typeof b?.password === 'string' && b.password ? b.password : undefined
  if (!name) return fail(c, 400, 'bad_name', { ar: 'الاسم مطلوب.', en: 'Name is required.' }, { field: 'name' })
  if (!EMAIL_RE.test(email)) return fail(c, 400, 'bad_email', { ar: 'البريد مش صحيح.', en: 'Not a valid email.' }, { field: 'email' })
  if (!isRole(role)) return fail(c, 400, 'bad_role', { ar: 'دور غير معروف.', en: 'Unknown role.' }, { field: 'role' })
  if (given !== undefined && given.length < MIN_PASSWORD) return fail(c, 400, 'weak_password', SHORT_PW, { field: 'password' })
  if (authByEmail(email)) return fail(c, 409, 'email_taken', EMAIL_TAKEN, { field: 'email' })
  // A staff record without a login (e.g. from the seed) with this email gets the login.
  const existing = list<Staff>('staff').find((s) => s.email.toLowerCase() === email && !authById(s.id))
  const doc: Staff = { id: existing?.id ?? 's' + randomBytes(5).toString('hex'), name, email, role, lastActive: existing?.lastActive ?? new Date(0).toISOString() }
  const password = given ?? generatePassword()
  await createLogin(doc.id, email, password)
  const rev = put('staff', doc.id, doc)
  audit(me, 'staff', doc.id, 'create', `role: ${role}`)
  return c.json({ staff: staffRow(doc), rev, ...(given ? {} : { password }) }, 201)
})

app.put('/api/admin/staff/:id', need('staff.manage'), async (c) => {
  const me = c.get('me')
  const id = c.req.param('id')
  const cur = get<Staff>('staff', id)?.doc
  if (!cur) return fail(c, 404, 'not_found', { ar: 'الحساب مش موجود.', en: 'No such staff member.' })
  const b = (await readJson(c)) as { name?: unknown; email?: unknown; role?: unknown; disabled?: unknown } | undefined
  const next: Staff = { ...cur }
  if (b?.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim().slice(0, 60) : ''
    if (!name) return fail(c, 400, 'bad_name', { ar: 'الاسم مطلوب.', en: 'Name is required.' }, { field: 'name' })
    next.name = name
  }
  if (b?.role !== undefined) {
    if (!isRole(b.role)) return fail(c, 400, 'bad_role', { ar: 'دور غير معروف.', en: 'Unknown role.' }, { field: 'role' })
    next.role = b.role
  }
  let email: string | undefined
  if (b?.email !== undefined) {
    email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
    if (!EMAIL_RE.test(email)) return fail(c, 400, 'bad_email', { ar: 'البريد مش صحيح.', en: 'Not a valid email.' }, { field: 'email' })
    const other = authByEmail(email)
    if (other && other.staff_id !== id) return fail(c, 409, 'email_taken', EMAIL_TAKEN, { field: 'email' })
    next.email = email
  }
  const auth = authById(id)
  const disable = typeof b?.disabled === 'boolean' ? b.disabled : undefined
  if (disable !== undefined && !auth) return fail(c, 400, 'no_login', { ar: 'الحساب ده مالوش تسجيل دخول.', en: 'This staff member has no sign-in.' })
  const losesOwner = cur.role === 'owner' && !!auth && !auth.disabled && (next.role !== 'owner' || disable === true)
  if (losesOwner && activeOwners(id).length === 0) return fail(c, 400, 'last_owner', LAST_OWNER)
  const rev = put('staff', id, next)
  if (email && auth) setLoginEmail(id, email)
  if (disable !== undefined) setDisabled(id, disable)
  const what = [...changedKeys(cur as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>), ...(disable !== undefined ? [disable ? 'disabled' : 'enabled'] : [])]
  audit(me, 'staff', id, 'update', what.join(', ') + (next.role !== cur.role ? ` (${cur.role} → ${next.role})` : ''))
  return c.json({ staff: staffRow(next), rev })
})

app.post('/api/admin/staff/:id/password', need('staff.manage'), async (c) => {
  const me = c.get('me')
  const id = c.req.param('id')
  const doc = get<Staff>('staff', id)?.doc
  if (!doc) return fail(c, 404, 'not_found', { ar: 'الحساب مش موجود.', en: 'No such staff member.' })
  const b = (await readJson(c)) as { password?: unknown } | undefined
  const given = typeof b?.password === 'string' && b.password ? b.password : undefined
  if (given !== undefined && given.length < MIN_PASSWORD) return fail(c, 400, 'weak_password', SHORT_PW, { field: 'password' })
  const password = given ?? generatePassword()
  if (authById(id)) {
    await setPassword(id, password)
    endSessions(id, id === me.id ? bearer(c) : undefined)
  } else {
    if (authByEmail(doc.email)) return fail(c, 409, 'email_taken', EMAIL_TAKEN, { field: 'email' })
    await createLogin(id, doc.email, password)
  }
  audit(me, 'staff', id, 'password')
  return c.json({ staff: staffRow(doc), ...(given ? {} : { password }) })
})

app.delete('/api/admin/staff/:id', need('staff.manage'), (c) => {
  const me = c.get('me')
  const id = c.req.param('id')
  const doc = get<Staff>('staff', id)?.doc
  if (!doc) return fail(c, 404, 'not_found', { ar: 'الحساب مش موجود.', en: 'No such staff member.' })
  if (id === me.id) return fail(c, 400, 'self', { ar: 'مينفعش حذف الحساب اللي داخل بيه دلوقتي.', en: 'You can’t delete the account you’re signed in with.' })
  const auth = authById(id)
  if (doc.role === 'owner' && auth && !auth.disabled && activeOwners(id).length === 0) return fail(c, 400, 'last_owner', LAST_OWNER)
  deleteLogin(id)
  remove('staff', id)
  audit(me, 'staff', id, 'delete', doc.name)
  return c.json({ ok: true })
})

app.get('/api/admin/audit', need('audit.view'), (c) => {
  const limit = Math.max(1, Math.min(500, Number(c.req.query('limit')) || 100))
  return c.json({ entries: recentAudit(limit) })
})

/* ───────────── Admin data ───────────── */

app.get('/api/admin/bootstrap', (c) => c.json(bootstrap()))

const validDoc = (doc: unknown, id: string) => !!doc && typeof doc === 'object' && !Array.isArray(doc) && (doc as { id?: unknown }).id === id

type AnyDoc = Record<string, unknown>

/** Attribution the client can't fake: new order events and new activity entries carry the signed-in name. */
function stamp(collection: string, before: AnyDoc | undefined, after: AnyDoc, me: Me): AnyDoc {
  if (collection === 'orders' && Array.isArray(after.events)) {
    const from = Array.isArray(before?.events) ? before.events.length : 0
    return { ...after, events: (after.events as OrderEvent[]).map((e, i) => (i >= from && e && typeof e === 'object' ? { ...e, by: me.name } : e)) }
  }
  if (collection === 'activity' && !before) return { ...after, who: me.name }
  return after
}

/** Storefront copy is rendered on every shop page: store only the cleaned shape, never raw input. */
const cleanSettings = (doc: unknown) => {
  const o = doc as Partial<Settings>
  return o && typeof o === 'object' && o.storefront !== undefined ? { ...o, storefront: sanitizeStorefront(o.storefront) } : doc
}

const auditWrite = (me: Me, collection: string, id: string, before: AnyDoc | undefined, after: AnyDoc | undefined) => {
  if (!after) audit(me, collection, id, 'delete')
  else if (!before) audit(me, collection, id, 'create')
  else audit(me, collection, id, 'update', changedKeys(before, after).join(', '))
}

app.put('/api/admin/settings', need('settings.edit'), async (c) => {
  const me = c.get('me')
  const b = await readJson(c)
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(c, 400, 'bad_doc', { ar: 'إعدادات غير صالحة.', en: 'Invalid settings.' })
  const before = getSettings()
  const rev = put('settings', 'main', { ...before, ...(cleanSettings(b) as Partial<Settings>) })
  auditWrite(me, 'settings', 'main', before as unknown as AnyDoc, getSettings() as unknown as AnyDoc)
  return c.json({ settings: getSettings(), rev })
})

app.put('/api/admin/:collection/:id', async (c) => {
  const me = c.get('me')
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  const doc = await readJson(c)
  if (!validDoc(doc, id)) return fail(c, 400, 'bad_doc', { ar: 'المستند لازم يكون JSON و id مطابق.', en: 'Body must be a JSON object whose id matches the URL.' })
  const base = c.req.query('rev')
  const cur = get<AnyDoc>(collection, id)
  const perm = writePermission(collection, cur?.doc, doc as AnyDoc)
  if (!allowed(me, perm)) return forbidden(c, perm === 'signed-in' ? null : perm, { doc: cur?.doc ?? null, rev: cur?.rev ?? 0 })
  if (base !== undefined && (cur?.rev ?? 0) !== Number(base)) return fail(c, 409, 'conflict', { ar: 'السجل اتغيّر من مكان تاني.', en: 'The record changed elsewhere.' }, { doc: cur?.doc ?? null, rev: cur?.rev ?? 0 })
  const next = stamp(collection, cur?.doc, doc as AnyDoc, me)
  const rev = put(collection, id, next)
  auditWrite(me, collection, id, cur?.doc, next)
  return c.json({ doc: next, rev })
})

app.get('/api/admin/:collection/:id', (c) => {
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  const cur = get(collection, id)
  if (!cur) return fail(c, 404, 'not_found', { ar: 'مش موجود.', en: 'Not found.' })
  return c.json({ doc: cur.doc, rev: cur.rev })
})

app.delete('/api/admin/:collection/:id', (c) => {
  const me = c.get('me')
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  const cur = get<AnyDoc>(collection, id)
  const perm = writePermission(collection, cur?.doc, undefined)
  if (!allowed(me, perm)) return forbidden(c, perm === 'signed-in' ? null : perm)
  remove(collection, id)
  if (cur) auditWrite(me, collection, id, cur.doc, undefined)
  return c.json({ ok: true })
})

type BatchOp = { op?: unknown; collection?: unknown; id?: unknown; doc?: unknown; rev?: unknown }
type Denied = { collection: string; id: string; doc: unknown; rev: number; permission: Permission | null }

/**
 * Many puts/deletes in one transaction, each checked against the revision the
 * client last saw. Every op is checked against the role first: if any is not
 * allowed, nothing is written and the 403 lists the refused records with their
 * stored versions so the client can put them back.
 */
app.post('/api/admin/batch', async (c) => {
  const me = c.get('me')
  const b = (await readJson(c)) as { ops?: BatchOp[] } | undefined
  if (!Array.isArray(b?.ops) || b.ops.length > 5000) return fail(c, 400, 'bad_batch', { ar: 'دفعة غير صالحة.', en: 'Invalid batch.' })
  for (const o of b.ops) {
    const okColl = typeof o.collection === 'string' && (isCollection(o.collection) || (o.collection === 'settings' && o.id === 'main' && o.op === 'put'))
    if (!okColl || typeof o.id !== 'string' || (o.op !== 'put' && o.op !== 'delete') || (o.op === 'put' && o.collection !== 'settings' && !validDoc(o.doc, o.id)) || (o.op === 'put' && (typeof o.doc !== 'object' || !o.doc)))
      return fail(c, 400, 'bad_op', { ar: 'عملية غير صالحة في الدفعة.', en: 'Invalid operation in batch.' }, { op: { collection: o.collection, id: o.id, op: o.op } })
    if (o.collection === 'settings' && o.op === 'put') o.doc = cleanSettings(o.doc)
  }
  const result = tx(() => {
    const denied: Denied[] = []
    for (const o of b.ops!) {
      const cur = get<AnyDoc>(o.collection as DocCollection, o.id as string)
      const perm = writePermission(o.collection as string, cur?.doc, o.op === 'put' ? (o.doc as AnyDoc) : undefined)
      if (!allowed(me, perm)) denied.push({ collection: o.collection as string, id: o.id as string, doc: cur?.doc ?? null, rev: cur?.rev ?? 0, permission: perm === 'signed-in' ? null : perm })
    }
    if (denied.length) return { denied }

    const revs: Record<string, Record<string, number>> = {}
    const conflicts: { collection: string; id: string; doc: unknown; rev: number }[] = []
    for (const o of b.ops!) {
      const coll = o.collection as DocCollection
      const id = o.id as string
      const cur = get<AnyDoc>(coll, id)
      const base = typeof o.rev === 'number' ? o.rev : undefined
      const stale = base === undefined ? !!cur : (cur?.rev ?? 0) !== base
      if (stale) {
        conflicts.push({ collection: coll, id, doc: cur?.doc ?? null, rev: cur?.rev ?? 0 })
        continue
      }
      if (o.op === 'delete') {
        remove(coll, id)
        ;(revs[coll] ??= {})[id] = 0
        if (cur) auditWrite(me, coll, id, cur.doc, undefined)
      } else {
        const next = stamp(coll, cur?.doc, o.doc as AnyDoc, me)
        ;(revs[coll] ??= {})[id] = put(coll, id, next)
        auditWrite(me, coll, id, cur?.doc, next)
      }
    }
    return { revs, conflicts }
  })
  if (result.denied) return forbidden(c, result.denied[0].permission, { denied: result.denied })
  return c.json({ revs: result.revs, conflicts: result.conflicts })
})

app.post('/api/admin/reset', need('data.reset'), (c) => {
  const me = c.get('me')
  // Logins outlive a data reset: keep every staff record (and role) as it is now.
  const staff = list<Staff>('staff')
  seed(true)
  tx(() => keepStaff(staff))
  db.exec('DELETE FROM events')
  audit(me, 'all', '*', 'reset')
  return c.json({ ok: true })
})

/* ───────────── Admin live + analytics ───────────── */

app.get('/api/admin/live', need('analytics.view'), (c) => {
  const names = new Map(list<Customer>('customers').map((x) => [x.id, x.name]))
  return c.json(liveStats(list<Order>('orders'), (id) => names.get(id)))
})

app.get('/api/admin/funnel', need('analytics.view'), (c) => {
  const days = Math.max(1, Math.min(365, Number(c.req.query('days')) || 30))
  return c.json(funnelStats(days))
})

/* ───────────── Admin integrations ───────────── */

// Status only (booleans and variable names): the order page needs it to offer courier booking and server-sent confirmations.
app.get('/api/admin/integrations', need('integrations.use', 'orders.edit'), (c) =>
  c.json({
    paymob: { configured: configured.paymob(), vars: PAYMOB_VARS },
    bosta: { configured: configured.bosta(), vars: BOSTA_VARS },
    whatsapp: { configured: configured.whatsapp(), vars: WHATSAPP_VARS },
  }),
)

// Booking a courier and sending the order-confirmation message are part of working an order.
app.post('/api/admin/couriers/bosta/:orderId', need('orders.edit'), async (c) => {
  if (!configured.bosta()) return notConfigured(c, 'Bosta', BOSTA_VARS)
  const me = c.get('me')
  const id = c.req.param('orderId')
  const by = me.name
  const o = get<Order>('orders', id)?.doc
  if (!o) return fail(c, 404, 'not_found', { ar: 'الطلب مش موجود.', en: 'Order not found.' })
  if (o.status === 'cancelled') return fail(c, 409, 'cancelled', { ar: 'الطلب ده ملغي.', en: 'This order is cancelled.' })
  if (o.tracking && o.courier === 'Bosta') return fail(c, 409, 'already_shipped', { ar: 'الطلب ده عنده شحنة بوسطة بالفعل.', en: 'This order already has a Bosta delivery.' })
  const customer = get<Customer>('customers', o.customerId)?.doc
  if (!customer) return fail(c, 409, 'no_customer', { ar: 'بيانات العميل ناقصة.', en: 'Customer record missing.' })
  try {
    const r = await createDelivery(o, customer)
    const updated = updateOrder(id, (x) => ({
      ...x,
      courier: 'Bosta',
      tracking: r.tracking,
      fulfillment: 'shipped',
      status: x.status === 'open' ? 'confirmed' : x.status,
      events: [...x.events, orderEvent('shipped', by, `Bosta ${r.tracking}`)],
    }))
    logActivity(by, { ar: `اتعمل شحنة بوسطة لطلب #${o.number}`, en: `Created Bosta delivery for order #${o.number}` }, `/admin/orders/${id}`)
    audit(me, 'orders', id, 'courier', `Bosta ${r.tracking}`)
    return c.json({ order: updated, rev: get('orders', id)!.rev })
  } catch (e) {
    return providerFail(c, 'Bosta', e)
  }
})

/*
  Cancel and return change the order and the stock in one transaction, so a
  restock can never be lost to an edit conflict on the product.
*/
type StockResult = { order: Order; rev: number; products: { doc: Product; rev: number }[]; lost: { productId: string; qty: number }[] }

function restockAndSave(o: Order, next: Order, restock: boolean): StockResult {
  const { products, lost } = restock ? restockLines(list<Product>('products'), o.lines) : { products: [], lost: [] }
  const saved = products.map((p) => ({ doc: p, rev: put('products', p.id, p) }))
  const rev = put('orders', o.id, next)
  return { order: next, rev, products: saved, lost }
}

app.post('/api/admin/orders/:id/cancel', need('orders.refund'), async (c) => {
  const me = c.get('me')
  const id = c.req.param('id')
  const b = ((await readJson(c)) ?? {}) as { reason?: unknown }
  const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, 300) : ''
  if (!reason) return fail(c, 400, 'reason_required', { ar: 'سبب الإلغاء مطلوب.', en: 'A cancel reason is required.' })
  const r = tx(() => {
    const o = get<Order>('orders', id)?.doc
    if (!o) return 'missing' as const
    if (!canCancel(o)) return 'not_cancellable' as const
    return restockAndSave(o, cancelOrderDoc(o, new Date().toISOString(), reason, me.name), true)
  })
  if (r === 'missing') return fail(c, 404, 'not_found', { ar: 'الطلب مش موجود.', en: 'Order not found.' })
  if (r === 'not_cancellable') return fail(c, 409, 'not_cancellable', { ar: 'الطلب ده اتلغى أو اتشحن خلاص. لو رجع، سجّليه مرتجع.', en: 'This order is already cancelled or has shipped. If it came back, record a return.' })
  audit(me, 'orders', id, 'cancel', reason)
  logActivity(me.name, { ar: `لغى طلب #${r.order.number}`, en: `Cancelled order #${r.order.number}` }, `/admin/orders/${id}`)
  return c.json(r)
})

app.post('/api/admin/orders/:id/return', need('orders.refund'), async (c) => {
  const me = c.get('me')
  const id = c.req.param('id')
  const b = ((await readJson(c)) ?? {}) as { restock?: unknown; refund?: unknown; note?: unknown }
  const restock = b.restock !== false
  const refund = b.refund !== false
  const note = typeof b.note === 'string' ? b.note.slice(0, 300) : ''
  const r = tx(() => {
    const o = get<Order>('orders', id)?.doc
    if (!o) return 'missing' as const
    if (!canReturn(o)) return 'not_returnable' as const
    return restockAndSave(o, returnOrderDoc(o, new Date().toISOString(), { refund, restocked: restock, note }, me.name), restock)
  })
  if (r === 'missing') return fail(c, 404, 'not_found', { ar: 'الطلب مش موجود.', en: 'Order not found.' })
  if (r === 'not_returnable') return fail(c, 409, 'not_returnable', { ar: 'المرتجع بيتسجّل للطلبات اللي اتشحنت أو اتسلّمت بس.', en: 'Returns apply only to shipped or delivered orders.' })
  audit(me, 'orders', id, 'return', `${restock ? 'restocked' : 'not restocked'}${r.order.paymentStatus === 'refunded' ? ', refunded' : ''}`)
  logActivity(me.name, { ar: `سجّل مرتجع طلب #${r.order.number}`, en: `Recorded a return for order #${r.order.number}` }, `/admin/orders/${id}`)
  return c.json(r)
})

app.post('/api/admin/whatsapp/send', need('orders.edit'), async (c) => {
  if (!configured.whatsapp()) return notConfigured(c, 'WhatsApp', WHATSAPP_VARS)
  const b = (await readJson(c)) as { to?: unknown; text?: unknown } | undefined
  const to = normalizePhone(typeof b?.to === 'string' ? b.to : '')
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, 4096) : ''
  if (!PHONE_RE.test(to) || !text) return fail(c, 400, 'bad_message', { ar: 'الرقم أو الرسالة مش صحيحين.', en: 'Invalid number or empty message.' })
  try {
    const r = await sendText(to, text)
    audit(c.get('me'), 'whatsapp', to.slice(-4), 'message')
    return c.json(r)
  } catch (e) {
    return providerFail(c, 'WhatsApp', e)
  }
})

app.all('/api/*', (c) => fail(c, 404, 'not_found', { ar: 'المسار ده مش موجود.', en: 'No such API route.' }))
