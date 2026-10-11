import { create } from 'zustand'
import { useStore } from '../store'
import type { Db } from '../data/seed'
import type { Customer, Discount, Order, Product, Review, Settings, Shipment, ShippingZone } from '../data/types'
import { api, apiAvailable, ApiError } from './api'

/*
  Bridges the zustand store and the API.
  - Storefront: `loadPublic()` swaps the catalogue, zones, settings and reviews
    for the server's copy.
  - Admin: `loadAdmin()` replaces every collection with the server's, then
    `startAdminSync()` watches the store and sends the documents that changed
    (by object identity: every action is an immutable update) in one batch.
  Anything applied from the server goes through `applyRemote`, which never
  echoes back as a write.
*/

export const COLLECTIONS = ['products', 'customers', 'orders', 'reviews', 'discounts', 'abandoned', 'shipments', 'zones', 'staff', 'activity'] as const
export type Collection = (typeof COLLECTIONS)[number]

type Remote = {
  /** undefined until the first probe resolves */
  online?: boolean
  paymob: boolean
  /** Admin save state for the small top-bar indicator */
  saving: 'idle' | 'saving' | 'saved' | 'error'
}
export const useRemote = create<Remote>()(() => ({ online: undefined, paymob: false, saving: 'idle' }))

void apiAvailable().then((online) => useRemote.setState({ online }))

let suspended = false
export function applyRemote(patch: Partial<Db> & Record<string, unknown>) {
  suspended = true
  try {
    useStore.setState(patch)
  } finally {
    suspended = false
  }
}

/* ───────────── Storefront ───────────── */

export type PublicData = {
  products: Product[]
  zones: ShippingZone[]
  settings: Settings
  reviews: Review[]
  offers: Discount[]
  reviewers: Customer[]
  shipments: Shipment[]
  payments: { paymob: boolean }
}

let publicLoad: Promise<boolean> | undefined
export function loadPublic(force = false): Promise<boolean> {
  if (publicLoad && !force) return publicLoad
  publicLoad = (async () => {
    if (!(await apiAvailable())) return false
    try {
      const d = await api<PublicData>('/api/public')
      const s = useStore.getState()
      const me = s.customers.find((c) => c.id === s.me)
      const customers = [...d.reviewers.filter((r) => r.id !== me?.id), ...(me ? [me] : [])]
      applyRemote({ products: d.products, zones: d.zones, settings: d.settings, reviews: d.reviews, discounts: d.offers, shipments: d.shipments, customers })
      useRemote.setState({ paymob: d.payments.paymob })
      return true
    } catch {
      publicLoad = undefined
      return false
    }
  })()
  return publicLoad
}

/** Fetch one active code's rules so the shared `evaluateCode` can price it. */
export async function fetchCode(code: string): Promise<Discount | undefined> {
  try {
    const d = await api<{ discount: Discount | null }>('/api/public/code', { body: { code } })
    if (!d.discount) return undefined
    const disc = d.discount
    applyRemote({ discounts: [...useStore.getState().discounts.filter((x) => x.id !== disc.id), disc] })
    return disc
  } catch {
    return undefined
  }
}

/** Pull one order's current state (phone must match) into the store. */
export async function refreshOrder(id: string, phone: string) {
  try {
    const o = await api<Order>(`/api/orders/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`)
    const orders = useStore.getState().orders
    applyRemote({ orders: orders.some((x) => x.id === o.id) ? orders.map((x) => (x.id === o.id ? o : x)) : [...orders, o] })
  } catch {
    /* not found or offline: keep what we have */
  }
}

/* ───────────── Admin ───────────── */

type Revs = Record<string, Record<string, number>>
type Bootstrap = { data: Db; revs: Revs }
type Op = { op: 'put' | 'delete'; collection: Collection | 'settings'; id: string; doc?: unknown; rev?: number }
type BatchResult = { revs: Revs; conflicts: { collection: Collection | 'settings'; id: string; doc: unknown | null; rev: number }[] }

let revs: Revs = {}

export async function loadAdmin() {
  const b = await api<Bootstrap>('/api/admin/bootstrap', { admin: true })
  revs = b.revs
  applyRemote({ ...b.data })
}

type Snapshot = Pick<Db, Collection | 'settings'>
const snap = (): Snapshot => {
  const s = useStore.getState()
  const out = { settings: s.settings } as Snapshot
  for (const c of COLLECTIONS) (out as Record<string, unknown>)[c] = s[c]
  return out
}

/** Safety net: a client wiping a whole collection is a bug, not an edit. */
const MAX_DELETES = 25

export function startAdminSync(opts: { onError: (msg: { ar: string; en: string }) => void; onConflict: () => void }) {
  let prev = snap()
  const pending = new Map<string, Op>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let inflight = false

  const flush = async () => {
    timer = undefined
    if (inflight || !pending.size) return
    inflight = true
    const ops = [...pending.values()].map((o) => ({ ...o, rev: revs[o.collection]?.[o.id] }))
    pending.clear()
    useRemote.setState({ saving: 'saving' })
    try {
      const r = await api<BatchResult>('/api/admin/batch', { body: { ops }, admin: true })
      for (const [c, m] of Object.entries(r.revs)) revs[c] = { ...revs[c], ...m }
      if (r.conflicts.length) {
        // Someone (a shopper's order, another admin) changed these first: take theirs.
        const s = useStore.getState() as unknown as Record<string, unknown>
        const patch: Record<string, unknown> = {}
        for (const cf of r.conflicts) {
          revs[cf.collection] = { ...revs[cf.collection], [cf.id]: cf.rev }
          if (cf.collection === 'settings') {
            if (cf.doc) patch.settings = cf.doc
            continue
          }
          const list = (patch[cf.collection] ?? s[cf.collection]) as { id: string }[]
          const without = list.filter((x) => x.id !== cf.id)
          patch[cf.collection] = cf.doc ? (list.some((x) => x.id === cf.id) ? list.map((x) => (x.id === cf.id ? cf.doc : x)) : [cf.doc, ...without]) : without
        }
        applyRemote(patch)
        prev = snap()
        opts.onConflict()
      }
      useRemote.setState({ saving: 'saved' })
    } catch (e) {
      useRemote.setState({ saving: 'error' })
      opts.onError(e instanceof ApiError ? e.bi : { ar: 'التعديل ما اتحفظش.', en: 'The change was not saved.' })
    } finally {
      inflight = false
      if (pending.size) schedule()
    }
  }
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, 300)
  }

  const unsub = useStore.subscribe(() => {
    const next = snap()
    if (suspended) {
      prev = next
      return
    }
    let changed = false
    for (const c of COLLECTIONS) {
      const a = prev[c] as { id: string }[]
      const b = next[c] as { id: string }[]
      if (a === b) continue
      const before = new Map(a.map((x) => [x.id, x]))
      const seen = new Set<string>()
      for (const doc of b) {
        seen.add(doc.id)
        if (before.get(doc.id) !== doc) {
          pending.set(`${c}/${doc.id}`, { op: 'put', collection: c, id: doc.id, doc })
          changed = true
        }
      }
      const gone = a.filter((x) => !seen.has(x.id))
      if (gone.length > MAX_DELETES) {
        opts.onError({ ar: `اتمنع حذف ${gone.length} سجل مرة واحدة.`, en: `Blocked deleting ${gone.length} records at once.` })
        continue
      }
      for (const x of gone) {
        pending.set(`${c}/${x.id}`, { op: 'delete', collection: c, id: x.id })
        changed = true
      }
    }
    if (next.settings !== prev.settings) {
      pending.set('settings/main', { op: 'put', collection: 'settings', id: 'main', doc: next.settings })
      changed = true
    }
    prev = next
    if (changed) schedule()
  })

  return {
    stop() {
      unsub()
      if (timer) {
        clearTimeout(timer)
        void flush()
      }
    },
    /** True when nothing is waiting to be saved */
    idle: () => !pending.size && !inflight,
  }
}

/** Put one document the server just returned (e.g. after a courier call) into the store at its new revision. */
export function applyServerDoc(collection: Collection, doc: { id: string }, rev: number) {
  revs[collection] = { ...revs[collection], [doc.id]: rev }
  const list = useStore.getState()[collection] as { id: string }[]
  applyRemote({ [collection]: list.some((x) => x.id === doc.id) ? list.map((x) => (x.id === doc.id ? doc : x)) : [doc, ...list] })
}

export async function adminLogin(password: string) {
  return api<{ token: string }>('/api/admin/login', { body: { password } })
}
