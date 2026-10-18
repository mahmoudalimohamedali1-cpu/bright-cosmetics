/*
  End-to-end check of the features Bright's admin has beyond a stock Shopify
  admin, run against the live API (npm run dev, or npm start).

    node scripts/verify.mjs [baseUrl]

  Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env (never prints them). Creates a
  temporary fulfilment staff account and a few test orders, then removes the
  account and cancels or returns the orders so all stock is put back.
*/
import fs from 'node:fs'

const BASE = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '') + '/api'
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}
const call = async (path, { method = 'GET', body, token } = {}) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await r.json() } catch { /* empty body */ }
  return { status: r.status, data }
}
const stockOf = (p) => p.batches.reduce((s, b) => s + b.qty, 0)

// ── Sign in as owner ──
const login = await call('/admin/login', { method: 'POST', body: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD } })
check('Owner signs in with a per-person account', login.status === 200)
const owner = login.data?.token
if (!owner) process.exit(1)

const boot = (await call('/admin/bootstrap', { token: owner })).data.data
const product = boot.products.find((p) => p.status === 'active' && p.batches.filter((b) => b.qty > 0).length >= 2)
  ?? boot.products.find((p) => p.status === 'active' && stockOf(p) > 2)
const earliest = [...product.batches].filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))[0]

// ── 1. Server-authoritative COD checkout with governorate pricing ──
const bad = await call('/orders', { method: 'POST', body: { lines: [{ productId: product.id, qty: 1 }], name: 'Verify', phone: '0123', governorateId: 'cai', address: 'x', payment: 'cod' } })
check('Rejects an invalid Egyptian mobile with a bilingual message', bad.status === 400 && !!bad.data?.error?.message?.ar && !!bad.data?.error?.message?.en)

const order = await call('/orders', {
  method: 'POST',
  body: { lines: [{ productId: product.id, qty: 1 }], name: 'Verify Script', phone: '01099999999', governorateId: 'asw', address: 'Test address', payment: 'cod' },
})
const o = order.data
const zone = boot.zones.find((z) => z.id === 'upper')
check('Places a cash-on-delivery order on the server', order.status === 201 || order.status === 200, `#${o?.number}`)
check('Upper Egypt shipping and COD fee come from the governorate zone',
  o && (o.shipping === (o.subtotal >= zone.freeOver ? 0 : zone.rate)) && o.codFee === zone.codFee,
  o ? `shipping ${o.shipping}, COD fee ${o.codFee}` : '')

// ── 2. FEFO: the unit ships from the earliest-expiring lot ──
const afterBoot = (await call('/admin/bootstrap', { token: owner })).data.data
const stored = afterBoot.orders.find((x) => x.id === o.id)
check('Stock is taken from the earliest-expiring lot first (FEFO)', stored?.lines[0]?.batchId === earliest.id, `lot ${earliest.lot}, expires ${earliest.expiry}`)
const pAfter = afterBoot.products.find((p) => p.id === product.id)
check('Stock on hand dropped by exactly one', stockOf(pAfter) === stockOf(product) - 1)

// ── 3. Margin on landed cost is recorded per line ──
check('Each order line carries its landed cost for true margin', typeof stored?.lines[0]?.cost === 'number' && stored.lines[0].cost > 0)

// ── 4. Role-based permissions enforced on the server ──
const email = `verify-${Date.now()}@bright.example`
const created = await call('/admin/staff', { method: 'POST', token: owner, body: { name: 'Verify Fulfilment', email, role: 'fulfillment' } })
const tempPass = created.data?.password
const staffId = created.data?.staff?.id ?? created.data?.id
check('Owner creates a fulfilment staff account', created.status === 201 && !!tempPass)
const fl = await call('/admin/login', { method: 'POST', body: { email, password: tempPass } })
const ft = fl.data?.token
const priceEdit = await call(`/admin/products/${product.id}`, { method: 'PUT', token: ft, body: { ...pAfter, price: pAfter.price + 1 } })
check('Fulfilment staff cannot change a price (403)', priceEdit.status === 403)
const packed = await call(`/admin/orders/${o.id}`, { method: 'PUT', token: ft, body: { ...stored, fulfillment: 'packed' } })
check('Fulfilment staff can mark the order packed', packed.status === 200)
const cancel = await call(`/admin/orders/${o.id}`, { method: 'PUT', token: ft, body: { ...stored, status: 'cancelled' } })
check('Fulfilment staff cannot cancel or refund (403)', cancel.status === 403)
const live = await call('/admin/live', { token: ft })
check('Fulfilment staff cannot see sales analytics (403)', live.status === 403)

// ── 5. Audit log names the person ──
const audit = await call('/admin/audit?limit=50', { token: owner })
const rows = audit.data?.entries ?? audit.data?.rows ?? audit.data ?? []
check('Audit log records who changed the order', Array.isArray(rows) && rows.some((r) => (r.doc_id ?? r.docId) === o.id && /Verify Fulfilment|fulfil/i.test(JSON.stringify(r))))

// ── 6. Real live traffic from storefront events ──
const session = `verify-${Date.now()}`
for (const type of ['view', 'product_view', 'add_to_cart', 'checkout_start']) {
  await call('/events', { method: 'POST', body: { session, type, path: `/p/${product.slug}`, productId: product.id } })
}
const live2 = await call('/admin/live', { token: owner })
check('Live view counts real sessions from the storefront', live2.status === 200 && (live2.data?.activeSessions ?? 0) >= 1, `active ${live2.data?.activeSessions}`)

// ── 7. Customer accounts, history, cancel and return ──
const phone = '01099999999'
const again = await call('/orders', { method: 'POST', body: { lines: [{ productId: product.id, qty: 2 }], name: 'Verify Again', phone: '+20 10 9999 9999', governorateId: 'cai', address: 'Test address 2', payment: 'cod' } })
const o2 = again.data
check('A returning customer (same mobile, other format) is matched, not duplicated', again.status === 201 && o2?.customerId === o?.customerId)
const histNoProof = await call(`/orders-history?phone=${phone}&order=1`)
const hist = await call(`/orders-history?phone=${phone}&order=${o.number}`)
check('Order history needs mobile + an order number, then lists all their orders',
  histNoProof.status === 404 && hist.status === 200 && [o.id, o2?.id].every((id) => hist.data?.orders?.some((x) => x.id === id)))
const cur1 = (await call(`/admin/orders/${o.id}`, { token: owner })).data
const doc1 = cur1?.doc ?? cur1
await call(`/admin/orders/${o.id}`, { method: 'PUT', token: owner, body: { ...doc1, events: [...doc1.events, { at: new Date().toISOString(), type: 'note', note: 'internal: verify note' }] } })
const pub = (await call(`/orders/${o.id}?phone=${phone}`)).data
check('Shoppers never see internal notes, staff names or risk flags',
  !!pub && !JSON.stringify(pub).includes('internal: verify note') && pub.events.every((e) => !e.by) && pub.risk === 'low' && pub.lines.every((l) => l.cost === 0))
const ftCancel = await call(`/admin/orders/${o2.id}/cancel`, { method: 'POST', token: ft, body: { reason: 'verify' } })
check('Fulfilment staff cannot cancel through the cancel endpoint (403)', ftCancel.status === 403)
const stockNow = async () => stockOf((await call('/admin/bootstrap', { token: owner })).data.data.products.find((p) => p.id === product.id))
const beforeCancel = await stockNow()
// A shopper's order lands between "admin loaded the product" and "admin cancels": the case that used to lose stock.
const between = await call('/orders', { method: 'POST', body: { lines: [{ productId: product.id, qty: 1 }], name: 'Verify Between', phone: '01088888888', governorateId: 'cai', address: 'Test address 3', payment: 'cod' } })
const cancelled = await call(`/admin/orders/${o2.id}/cancel`, { method: 'POST', token: owner, body: { reason: 'Verify script' } })
const afterCancel = await stockNow()
check('Cancel returns the units to stock on the server, even after another order changed the product', cancelled.status === 200 && afterCancel === beforeCancel - 1 + 2, `${beforeCancel} → ${afterCancel}`)
const twice = await call(`/admin/orders/${o2.id}/cancel`, { method: 'POST', token: owner, body: { reason: 'again' } })
check('Cancelling twice is refused (no double restock)', twice.status === 409)
const b3 = between.data
const cur3 = (await call(`/admin/orders/${b3.id}`, { token: owner })).data
const doc3 = cur3?.doc ?? cur3
await call(`/admin/orders/${b3.id}`, { method: 'PUT', token: owner, body: { ...doc3, status: 'confirmed', fulfillment: 'shipped', events: [...doc3.events, { at: new Date().toISOString(), type: 'shipped' }] } })
const cantCancel = await call(`/admin/orders/${b3.id}/cancel`, { method: 'POST', token: owner, body: { reason: 'too late' } })
const returned = await call(`/admin/orders/${b3.id}/return`, { method: 'POST', token: owner, body: { restock: true, refund: true, note: 'Refused at the door' } })
const afterReturn = await stockNow()
check('A shipped order cannot be cancelled; a return puts it back in stock',
  cantCancel.status === 409 && returned.status === 200 && returned.data?.order?.fulfillment === 'returned' && afterReturn === afterCancel + 1, `${afterCancel} → ${afterReturn}`)

// ── Clean up (the cancel endpoint puts the stock back) ──
await call(`/admin/orders/${o.id}/cancel`, { method: 'POST', token: owner, body: { reason: 'Verify script clean-up' } })
if (staffId) await call(`/admin/staff/${staffId}`, { method: 'DELETE', token: owner })
await call('/admin/logout', { method: 'POST', token: owner })

console.log(`\n${pass} passed, ${fail} failed`)
process.exitCode = fail ? 1 : 0
