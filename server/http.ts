import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type Bi = { ar: string; en: string }

/** Every API error has the same shape: { error: { code, message: { ar, en } } } */
export function fail(c: Context, status: ContentfulStatusCode, code: string, message: Bi, extra?: Record<string, unknown>) {
  return c.json({ error: { code, message, ...extra } }, status)
}

export const notConfigured = (c: Context, what: string, vars: string[]) =>
  fail(
    c,
    501,
    'not_configured',
    { ar: `${what} مش متوصّل. محتاج متغيرات البيئة: ${vars.join('، ')}.`, en: `${what} is not configured. Set: ${vars.join(', ')}.` },
    { vars },
  )

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    return undefined
  }
}

export function clientIp(c: Context) {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'
}

/** Fixed-window in-memory limiter: allow `max` hits per `windowMs` per key. */
export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, { n: number; start: number }>()
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k)
  }, windowMs).unref()
  return (key: string) => {
    const now = Date.now()
    const h = hits.get(key)
    if (!h || now - h.start > windowMs) {
      hits.set(key, { n: 1, start: now })
      return true
    }
    h.n++
    return h.n <= max
  }
}

/** A third-party API (Paymob, Bosta, WhatsApp) answered with an error. */
export class ProviderError extends Error {
  status: number
  detail: unknown
  constructor(message: string, status: number, detail: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}
