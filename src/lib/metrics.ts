import type { Customer, Order, Product } from '../data/types'
import { DAY } from './rand'

/* Pure analytics helpers shared by every admin screen. */

export const isCounted = (o: Order) => o.status !== 'cancelled'
export const netRevenue = (o: Order) => (isCounted(o) && o.fulfillment !== 'returned' ? o.total - o.shipping - o.codFee : 0)
export const grossProfit = (o: Order) =>
  isCounted(o) && o.fulfillment !== 'returned' ? o.lines.reduce((s, l) => s + (l.price - l.cost) * l.qty, 0) - o.discount : 0

export function inRange(o: Order, from: number, to: number) {
  const t = new Date(o.createdAt).getTime()
  return t >= from && t < to
}

export function rangeFor(days: number, offsetPeriods = 0) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const to = end.getTime() + 1 - offsetPeriods * days * DAY
  return { from: to - days * DAY, to }
}

export type Kpis = {
  revenue: number
  orders: number
  aov: number
  profit: number
  margin: number
  units: number
  newCustomers: number
  returningRate: number
  cancelRate: number
  codShare: number
}

export function kpis(orders: Order[], customers: Customer[], from: number, to: number): Kpis {
  const os = orders.filter((o) => inRange(o, from, to))
  const counted = os.filter(isCounted)
  const revenue = counted.reduce((s, o) => s + netRevenue(o), 0)
  const profit = counted.reduce((s, o) => s + grossProfit(o), 0)
  const units = counted.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty, 0), 0)
  const firstOrder = new Map<string, number>()
  for (const o of orders) {
    const t = new Date(o.createdAt).getTime()
    const prev = firstOrder.get(o.customerId)
    if (prev === undefined || t < prev) firstOrder.set(o.customerId, t)
  }
  const buyers = new Set(counted.map((o) => o.customerId))
  let returning = 0
  buyers.forEach((c) => {
    if ((firstOrder.get(c) ?? 0) < from) returning++
  })
  const newCustomers = customers.filter((c) => {
    const t = new Date(c.createdAt).getTime()
    return t >= from && t < to
  }).length
  return {
    revenue,
    orders: counted.length,
    aov: counted.length ? revenue / counted.length : 0,
    profit,
    margin: revenue ? profit / revenue : 0,
    units,
    newCustomers,
    returningRate: buyers.size ? returning / buyers.size : 0,
    cancelRate: os.length ? os.filter((o) => o.status === 'cancelled').length / os.length : 0,
    codShare: counted.length ? counted.filter((o) => o.payment === 'cod').length / counted.length : 0,
  }
}

export function delta(cur: number, prev: number) {
  if (!prev) return cur ? 1 : 0
  return (cur - prev) / prev
}

/** YYYY-MM-DD in the viewer's timezone (Egypt), not UTC */
export function localDay(t: number) {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type DayPoint = { date: string; revenue: number; orders: number; profit: number; prevRevenue?: number }

export function dailySeries(orders: Order[], days: number): DayPoint[] {
  const { from } = rangeFor(days)
  const prevFrom = from - days * DAY
  const buckets: DayPoint[] = Array.from({ length: days }, (_, i) => ({
    date: localDay(from + i * DAY),
    revenue: 0,
    orders: 0,
    profit: 0,
    prevRevenue: 0,
  }))
  for (const o of orders) {
    if (!isCounted(o)) continue
    const t = new Date(o.createdAt).getTime()
    const i = Math.floor((t - from) / DAY)
    if (i >= 0 && i < days) {
      buckets[i].revenue += netRevenue(o)
      buckets[i].profit += grossProfit(o)
      buckets[i].orders += 1
    }
    const j = Math.floor((t - prevFrom) / DAY)
    if (j >= 0 && j < days) buckets[j].prevRevenue! += netRevenue(o)
  }
  return buckets
}

export function productSales(orders: Order[], from: number, to = Date.now() + DAY) {
  const m = new Map<string, { units: number; revenue: number; profit: number; orders: number }>()
  for (const o of orders) {
    if (!isCounted(o) || !inRange(o, from, to)) continue
    for (const l of o.lines) {
      const e = m.get(l.productId) ?? { units: 0, revenue: 0, profit: 0, orders: 0 }
      e.units += l.qty
      e.revenue += l.price * l.qty
      e.profit += (l.price - l.cost) * l.qty
      e.orders += 1
      m.set(l.productId, e)
    }
  }
  return m
}

export const stock = (p: Product) => p.batches.reduce((s, b) => s + b.qty, 0)

/** Days of cover at the last-30-day sales velocity. Infinity when nothing sells. */
export function daysOfCover(p: Product, sales30: Map<string, { units: number }>) {
  const v = (sales30.get(p.id)?.units ?? 0) / 30
  return v > 0 ? stock(p) / v : Infinity
}

export function reorderQty(p: Product, sales30: Map<string, { units: number }>, leadDays = 21, targetDays = 60) {
  const v = (sales30.get(p.id)?.units ?? 0) / 30
  return Math.max(0, Math.ceil(v * (leadDays + targetDays) - stock(p)))
}

export function expiringBatches(products: Product[], withinDays: number) {
  const limit = Date.now() + withinDays * DAY
  return products
    .flatMap((p) => p.batches.filter((b) => b.qty > 0 && new Date(b.expiry).getTime() < limit).map((b) => ({ product: p, batch: b })))
    .sort((a, b) => a.batch.expiry.localeCompare(b.batch.expiry))
}

export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY)

/* RFM segmentation — scores 1..5 by quintile */
export type Segment = 'champions' | 'loyal' | 'promising' | 'new' | 'at_risk' | 'hibernating' | 'cant_lose'

export type CustomerStats = {
  customer: Customer
  orders: number
  spent: number
  aov: number
  lastOrder?: string
  firstOrder?: string
  recencyDays: number
  r: number
  f: number
  m: number
  segment: Segment
}

export function customerStats(customers: Customer[], orders: Order[]): CustomerStats[] {
  const by = new Map<string, Order[]>()
  for (const o of orders) {
    if (!isCounted(o)) continue
    const a = by.get(o.customerId) ?? []
    a.push(o)
    by.set(o.customerId, a)
  }
  const rows = customers.map((c) => {
    const os = (by.get(c.id) ?? []).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const spent = os.reduce((s, o) => s + netRevenue(o), 0)
    const last = os[os.length - 1]?.createdAt
    return {
      customer: c,
      orders: os.length,
      spent,
      aov: os.length ? spent / os.length : 0,
      lastOrder: last,
      firstOrder: os[0]?.createdAt,
      recencyDays: last ? Math.floor((Date.now() - new Date(last).getTime()) / DAY) : 9999,
      r: 0,
      f: 0,
      m: 0,
      segment: 'new' as Segment,
    }
  })
  const buyers = rows.filter((r) => r.orders > 0)
  const score = (vals: number[], v: number, invert = false) => {
    const sorted = [...vals].sort((a, b) => a - b)
    const idx = sorted.findIndex((x) => x >= v)
    const q = Math.min(5, Math.floor(((idx < 0 ? sorted.length - 1 : idx) / sorted.length) * 5) + 1)
    return invert ? 6 - q : q
  }
  const R = buyers.map((b) => b.recencyDays)
  const F = buyers.map((b) => b.orders)
  const M = buyers.map((b) => b.spent)
  for (const b of rows) {
    if (!b.orders) {
      b.segment = 'new'
      continue
    }
    b.r = score(R, b.recencyDays, true)
    b.f = score(F, b.orders)
    b.m = score(M, b.spent)
    const fm = (b.f + b.m) / 2
    b.segment =
      b.r >= 4 && fm >= 4 ? 'champions'
      : b.r >= 3 && fm >= 3 ? 'loyal'
      : b.r >= 4 && fm < 3 ? 'promising'
      : b.r <= 2 && fm >= 4 ? 'cant_lose'
      : b.r <= 2 && fm >= 2.5 ? 'at_risk'
      : b.r <= 2 ? 'hibernating'
      : 'promising'
  }
  return rows
}

export const SEGMENT_LABEL: Record<Segment, { ar: string; en: string; hint: { ar: string; en: string } }> = {
  champions: { ar: 'الأبطال', en: 'Champions', hint: { ar: 'اشتروا قريب وكتير وبيصرفوا أكتر. يستاهلوا مكافأة.', en: 'Bought recently, often, and spend the most. Reward them.' } },
  loyal: { ar: 'الأوفياء', en: 'Loyal', hint: { ar: 'بيرجعوا بانتظام. مرشّحين لعرض الروتين الكامل.', en: 'Come back regularly. Offer them the full routine.' } },
  promising: { ar: 'واعدين', en: 'Promising', hint: { ar: 'اشتروا قريب مرة أو اتنين. الهدف: الطلب التاني.', en: 'Recent but light buyers. Nudge the second order.' } },
  new: { ar: 'بدون طلبات', en: 'No orders yet', hint: { ar: 'سجّلوا ولسه ما اشتروش.', en: 'Signed up, never bought.' } },
  at_risk: { ar: 'معرّضين للخسارة', en: 'At risk', hint: { ar: 'كانوا بيشتروا كويس واختفوا. محتاجين رسالة.', en: 'Used to buy well, gone quiet. Reach out.' } },
  cant_lose: { ar: 'ما ينفعش نخسرهم', en: 'Can’t lose', hint: { ar: 'من أعلى العملاء صرفًا وبقالهم فترة. محتاجين مكالمة.', en: 'Top spenders who have lapsed. Call them.' } },
  hibernating: { ar: 'نايمين', en: 'Hibernating', hint: { ar: 'طلب واحد قديم وصغير.', en: 'One small, old order.' } },
}

/** Monthly acquisition cohorts and the share that ordered again in each later month. */
export function cohorts(orders: Order[], months = 6) {
  const first = new Map<string, string>()
  const active = new Map<string, Set<string>>()
  const ym = (iso: string) => iso.slice(0, 7)
  const sorted = orders.filter(isCounted).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const o of sorted) {
    const m = ym(o.createdAt)
    if (!first.has(o.customerId)) first.set(o.customerId, m)
    const s = active.get(o.customerId) ?? new Set<string>()
    s.add(m)
    active.set(o.customerId, s)
  }
  const now = new Date()
  const monthsList = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  return monthsList.map((m, i) => {
    const members = [...first.entries()].filter(([, f]) => f === m).map(([c]) => c)
    const cells = monthsList.slice(i).map((mm, k) => ({
      offset: k,
      rate: members.length ? members.filter((c) => active.get(c)!.has(mm)).length / members.length : 0,
    }))
    return { month: m, size: members.length, cells }
  })
}
