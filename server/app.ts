import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { Customer, Discount, Order, Product, Review, Settings, Shipment, ShippingZone } from '../src/data/types'
import { normalizePhone, PHONE_RE } from '../src/lib/commerce'
import { EVENT_TYPES, funnelStats, liveStats, recordEvent } from './analytics'
import type { EventType } from './analytics'
import { bootstrap, db, get, getSettings, isCollection, list, put, remove, seed, tx } from './db'
import type { DocCollection } from './db'
import { configured, env } from './env'
import { clientIp, fail, limiter, notConfigured, ProviderError, readJson } from './http'
import { BOSTA_VARS, createDelivery } from './integrations/bosta'
import { createIntention, orderIdFrom, PAYMOB_VARS, verifyHmac } from './integrations/paymob'
import type { PaymobTxn } from './integrations/paymob'
import { sendText, WHATSAPP_VARS } from './integrations/whatsapp'
import { createOrder, findOrderForPhone, logActivity, orderEvent, updateOrder } from './orders'

export const app = new Hono()

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
const publicOrder = (o: Order): Order => ({ ...o, lines: o.lines.map((l) => ({ ...l, cost: 0 })) })
const initialName = (full: string) => {
  const [first, last] = full.split(' ')
  return last ? `${first} ${last[0]}.` : first
}

app.get('/api/public', (c) => {
  const products = list<Product>('products').filter((p) => p.status === 'active')
  const reviews = list<Review>('reviews').filter((r) => r.status === 'published')
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

const SESSION_MS = 7 * 24 * 3600_000
const loginLimit = limiter(10, 15 * 60_000)
const sha = (s: string) => createHash('sha256').update(s).digest()

app.post('/api/admin/login', async (c) => {
  if (!env.adminPassword) return fail(c, 503, 'admin_not_configured', { ar: 'كلمة سر الأدمن مش متضبطة على السيرفر (ADMIN_PASSWORD).', en: 'ADMIN_PASSWORD is not set on the server.' })
  if (!loginLimit(clientIp(c))) return fail(c, 429, 'rate_limited', { ar: 'محاولات كتير. استنى ربع ساعة.', en: 'Too many attempts. Wait 15 minutes.' })
  const b = (await readJson(c)) as { password?: unknown } | undefined
  const pw = typeof b?.password === 'string' ? b.password : ''
  if (!pw || !timingSafeEqual(sha(pw), sha(env.adminPassword))) return fail(c, 401, 'bad_password', { ar: 'كلمة السر مش صحيحة.', en: 'Wrong password.' })
  const token = randomBytes(32).toString('base64url')
  db.prepare('DELETE FROM admin_sessions WHERE created_at < ?').run(Date.now() - SESSION_MS)
  db.prepare('INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)').run(token, Date.now())
  return c.json({ token })
})

const bearer = (c: Context) => c.req.header('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1]

async function requireAdmin(c: Context, next: Next) {
  if (c.req.path === '/api/admin/login') return next()
  const t = bearer(c)
  const row = t ? (db.prepare('SELECT created_at FROM admin_sessions WHERE token = ?').get(t) as { created_at: number } | undefined) : undefined
  if (!row || Date.now() - Number(row.created_at) > SESSION_MS) return fail(c, 401, 'unauthorized', { ar: 'لازم تسجيل الدخول.', en: 'Sign in required.' })
  return next()
}
app.use('/api/admin/*', requireAdmin)

app.post('/api/admin/logout', (c) => {
  db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(bearer(c) ?? '')
  return c.json({ ok: true })
})

/* ───────────── Admin data ───────────── */

app.get('/api/admin/bootstrap', (c) => c.json(bootstrap()))

const validDoc = (doc: unknown, id: string) => !!doc && typeof doc === 'object' && !Array.isArray(doc) && (doc as { id?: unknown }).id === id

app.put('/api/admin/settings', async (c) => {
  const b = await readJson(c)
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(c, 400, 'bad_doc', { ar: 'إعدادات غير صالحة.', en: 'Invalid settings.' })
  const rev = put('settings', 'main', { ...getSettings(), ...(b as Partial<Settings>) })
  return c.json({ settings: getSettings(), rev })
})

app.put('/api/admin/:collection/:id', async (c) => {
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  const doc = await readJson(c)
  if (!validDoc(doc, id)) return fail(c, 400, 'bad_doc', { ar: 'المستند لازم يكون JSON و id مطابق.', en: 'Body must be a JSON object whose id matches the URL.' })
  const base = c.req.query('rev')
  const cur = get(collection, id)
  if (base !== undefined && (cur?.rev ?? 0) !== Number(base)) return fail(c, 409, 'conflict', { ar: 'السجل اتغيّر من مكان تاني.', en: 'The record changed elsewhere.' }, { doc: cur?.doc ?? null, rev: cur?.rev ?? 0 })
  return c.json({ doc, rev: put(collection, id, doc) })
})

app.get('/api/admin/:collection/:id', (c) => {
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  const cur = get(collection, id)
  if (!cur) return fail(c, 404, 'not_found', { ar: 'مش موجود.', en: 'Not found.' })
  return c.json({ doc: cur.doc, rev: cur.rev })
})

app.delete('/api/admin/:collection/:id', (c) => {
  const { collection, id } = c.req.param()
  if (!isCollection(collection)) return fail(c, 404, 'unknown_collection', { ar: 'مجموعة غير معروفة.', en: 'Unknown collection.' })
  remove(collection, id)
  return c.json({ ok: true })
})

type BatchOp = { op?: unknown; collection?: unknown; id?: unknown; doc?: unknown; rev?: unknown }

/** Many puts/deletes in one transaction, each checked against the revision the client last saw. */
app.post('/api/admin/batch', async (c) => {
  const b = (await readJson(c)) as { ops?: BatchOp[] } | undefined
  if (!Array.isArray(b?.ops) || b.ops.length > 5000) return fail(c, 400, 'bad_batch', { ar: 'دفعة غير صالحة.', en: 'Invalid batch.' })
  for (const o of b.ops) {
    const okColl = typeof o.collection === 'string' && (isCollection(o.collection) || (o.collection === 'settings' && o.id === 'main' && o.op === 'put'))
    if (!okColl || typeof o.id !== 'string' || (o.op !== 'put' && o.op !== 'delete') || (o.op === 'put' && o.collection !== 'settings' && !validDoc(o.doc, o.id)) || (o.op === 'put' && (typeof o.doc !== 'object' || !o.doc)))
      return fail(c, 400, 'bad_op', { ar: 'عملية غير صالحة في الدفعة.', en: 'Invalid operation in batch.' }, { op: { collection: o.collection, id: o.id, op: o.op } })
  }
  const result = tx(() => {
    const revs: Record<string, Record<string, number>> = {}
    const conflicts: { collection: string; id: string; doc: unknown; rev: number }[] = []
    for (const o of b.ops!) {
      const coll = o.collection as DocCollection
      const id = o.id as string
      const cur = get(coll, id)
      const base = typeof o.rev === 'number' ? o.rev : undefined
      const stale = base === undefined ? !!cur : (cur?.rev ?? 0) !== base
      if (stale) {
        conflicts.push({ collection: coll, id, doc: cur?.doc ?? null, rev: cur?.rev ?? 0 })
        continue
      }
      if (o.op === 'delete') {
        remove(coll, id)
        ;(revs[coll] ??= {})[id] = 0
      } else (revs[coll] ??= {})[id] = put(coll, id, o.doc)
    }
    return { revs, conflicts }
  })
  return c.json(result)
})

app.post('/api/admin/reset', (c) => {
  seed(true)
  db.exec('DELETE FROM events')
  return c.json({ ok: true })
})

/* ───────────── Admin live + analytics ───────────── */

app.get('/api/admin/live', (c) => {
  const names = new Map(list<Customer>('customers').map((x) => [x.id, x.name]))
  return c.json(liveStats(list<Order>('orders'), (id) => names.get(id)))
})

app.get('/api/admin/funnel', (c) => {
  const days = Math.max(1, Math.min(365, Number(c.req.query('days')) || 30))
  return c.json(funnelStats(days))
})

/* ───────────── Admin integrations ───────────── */

app.get('/api/admin/integrations', (c) =>
  c.json({
    paymob: { configured: configured.paymob(), vars: PAYMOB_VARS },
    bosta: { configured: configured.bosta(), vars: BOSTA_VARS },
    whatsapp: { configured: configured.whatsapp(), vars: WHATSAPP_VARS },
  }),
)

app.post('/api/admin/couriers/bosta/:orderId', async (c) => {
  if (!configured.bosta()) return notConfigured(c, 'Bosta', BOSTA_VARS)
  const id = c.req.param('orderId')
  const b = (await readJson(c)) as { by?: unknown } | undefined
  const by = typeof b?.by === 'string' ? b.by.slice(0, 60) : 'Admin'
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
    return c.json({ order: updated, rev: get('orders', id)!.rev })
  } catch (e) {
    return providerFail(c, 'Bosta', e)
  }
})

app.post('/api/admin/whatsapp/send', async (c) => {
  if (!configured.whatsapp()) return notConfigured(c, 'WhatsApp', WHATSAPP_VARS)
  const b = (await readJson(c)) as { to?: unknown; text?: unknown } | undefined
  const to = normalizePhone(typeof b?.to === 'string' ? b.to : '')
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, 4096) : ''
  if (!PHONE_RE.test(to) || !text) return fail(c, 400, 'bad_message', { ar: 'الرقم أو الرسالة مش صحيحين.', en: 'Invalid number or empty message.' })
  try {
    return c.json(await sendText(to, text))
  } catch (e) {
    return providerFail(c, 'WhatsApp', e)
  }
})

app.all('/api/*', (c) => fail(c, 404, 'not_found', { ar: 'المسار ده مش موجود.', en: 'No such API route.' }))
