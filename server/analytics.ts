import type { Order } from '../src/data/types'
import type { Bi } from './http'
import { db } from './db'

export const EVENT_TYPES = ['view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase'] as const
export type EventType = (typeof EVENT_TYPES)[number]

const insert = db.prepare('INSERT INTO events (at, session, type, path, product_id, value, meta) VALUES (?, ?, ?, ?, ?, ?, ?)')

export function recordEvent(e: { session: string; type: EventType; path?: string; productId?: string; value?: number; meta?: Record<string, string> }) {
  insert.run(Date.now(), e.session, e.type, e.path ?? null, e.productId ?? null, e.value ?? null, e.meta && Object.keys(e.meta).length ? JSON.stringify(e.meta) : null)
}

const MIN = 60_000

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Distinct sessions reaching each funnel step since `from`. */
function funnelSince(from: number) {
  const r = db
    .prepare(
      `SELECT
        COUNT(DISTINCT session) AS sessions,
        COUNT(DISTINCT CASE WHEN type = 'product_view' THEN session END) AS product_views,
        COUNT(DISTINCT CASE WHEN type = 'add_to_cart' THEN session END) AS add_to_cart,
        COUNT(DISTINCT CASE WHEN type = 'checkout_start' THEN session END) AS checkout,
        COUNT(DISTINCT CASE WHEN type = 'purchase' THEN session END) AS purchase
      FROM events WHERE at >= ?`,
    )
    .get(from) as Record<string, number>
  return {
    sessions: Number(r.sessions),
    productViews: Number(r.product_views),
    addToCart: Number(r.add_to_cart),
    checkout: Number(r.checkout),
    purchase: Number(r.purchase),
  }
}

function sourceOf(meta: string | null): string {
  if (!meta) return 'direct'
  let m: { ref?: string; utm?: string } = {}
  try {
    m = JSON.parse(meta)
  } catch {
    return 'direct'
  }
  const s = `${m.utm ?? ''} ${m.ref ?? ''}`.toLowerCase()
  if (/instagram/.test(s)) return 'instagram'
  if (/tiktok/.test(s)) return 'tiktok'
  if (/google|bing|duckduckgo/.test(s)) return 'search'
  if (/whatsapp|wa\.me/.test(s)) return 'whatsapp'
  if (/facebook|fb\./.test(s)) return 'facebook'
  if (!s.trim()) return 'direct'
  return 'other'
}

export function liveStats(orders: Order[], nameOf: (customerId: string) => Bi | undefined) {
  const now = Date.now()
  const since5 = now - 5 * MIN
  const since30 = now - 30 * MIN

  const active = Number((db.prepare('SELECT COUNT(DISTINCT session) AS n FROM events WHERE at >= ?').get(since5) as { n: number }).n)
  const byPath = (db.prepare("SELECT path, COUNT(*) AS views, COUNT(DISTINCT session) AS sessions FROM events WHERE at >= ? AND type IN ('view') AND path IS NOT NULL GROUP BY path ORDER BY views DESC LIMIT 10").all(since30) as { path: string; views: number; sessions: number }[]).map((r) => ({ path: r.path, views: Number(r.views), sessions: Number(r.sessions) }))
  const byProduct = (db.prepare("SELECT product_id, COUNT(*) AS views, COUNT(DISTINCT session) AS sessions FROM events WHERE at >= ? AND type = 'product_view' AND product_id IS NOT NULL GROUP BY product_id ORDER BY views DESC LIMIT 8").all(since30) as { product_id: string; views: number; sessions: number }[]).map((r) => ({ productId: r.product_id, views: Number(r.views), sessions: Number(r.sessions) }))

  const open = (type: string) =>
    db
      .prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(v), 0) AS value FROM (
          SELECT session, SUM(COALESCE(value, 0)) AS v FROM events e
          WHERE at >= ? AND type = ?
          AND NOT EXISTS (SELECT 1 FROM events p WHERE p.session = e.session AND p.type = 'purchase' AND p.at >= ?)
          GROUP BY session)`,
      )
      .get(since30, type, since30) as { n: number; value: number }
  const carts = open('add_to_cart')
  const checkout = open('checkout_start')

  const sessions30 = db.prepare('SELECT session, MIN(at) AS first, (SELECT meta FROM events m WHERE m.session = e.session AND m.meta IS NOT NULL ORDER BY at LIMIT 1) AS meta FROM events e WHERE at >= ? GROUP BY session').all(since30) as { session: string; meta: string | null }[]
  const sources = new Map<string, number>()
  for (const s of sessions30) sources.set(sourceOf(s.meta), (sources.get(sourceOf(s.meta)) ?? 0) + 1)

  const lastHour = orders
    .filter((o) => now - new Date(o.createdAt).getTime() < 60 * MIN)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => ({ id: o.id, number: o.number, customer: nameOf(o.customerId), governorateId: o.governorateId, payment: o.payment, paymentStatus: o.paymentStatus, total: o.total, createdAt: o.createdAt }))
  const today = orders.filter((o) => new Date(o.createdAt).getTime() >= startOfToday() && o.status !== 'cancelled')

  return {
    at: new Date(now).toISOString(),
    activeSessions: active,
    sessions30: sessions30.length,
    byPath,
    byProduct,
    carts: { sessions: Number(carts.n), value: Number(carts.value) },
    atCheckout: { sessions: Number(checkout.n) },
    sources: [...sources.entries()].map(([key, n]) => ({ key, sessions: n })).sort((a, b) => b.sessions - a.sessions),
    funnelToday: funnelSince(startOfToday()),
    ordersLastHour: lastHour,
    ordersToday: { count: today.length, total: today.reduce((a, o) => a + o.total, 0) },
  }
}

export function funnelStats(days: number) {
  const from = Date.now() - days * 24 * 60 * MIN
  const first = db.prepare('SELECT MIN(at) AS t FROM events').get() as { t: number | null }
  return { days, from: new Date(from).toISOString(), trackingSince: first.t ? new Date(Number(first.t)).toISOString() : null, ...funnelSince(from) }
}
