import type { Bi } from '../i18n'

/*
  Thin client for the Bright API (server/). The app must keep working with no
  server at all (static preview, demo deploys), so every caller first asks
  `apiAvailable()`, which probes /api/health once with a short timeout and
  caches the answer for the page's lifetime.
*/

const TOKEN_KEY = 'nuri-admin-token'

export class ApiError extends Error {
  status: number
  code: string
  bi: Bi
  /** The rest of the server's error object (e.g. `denied` on a 403 batch) */
  detail: Record<string, unknown>
  constructor(status: number, code: string, bi: Bi, detail: Record<string, unknown> = {}) {
    super(bi.en)
    this.status = status
    this.code = code
    this.bi = bi
    this.detail = detail
  }
}

let probe: Promise<boolean> | undefined

export function apiAvailable(): Promise<boolean> {
  probe ??= (async () => {
    if (typeof fetch === 'undefined') return false
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 1500)
    try {
      const r = await fetch('/api/health', { signal: ctl.signal, headers: { accept: 'application/json' } })
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return false
      const j = (await r.json()) as { ok?: boolean }
      return j.ok === true
    } catch {
      return false
    } finally {
      clearTimeout(t)
    }
  })()
  return probe
}

export const adminToken = {
  get(): string | undefined {
    try {
      return sessionStorage.getItem(TOKEN_KEY) ?? undefined
    } catch {
      return undefined
    }
  },
  set(t: string | undefined) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t)
      else sessionStorage.removeItem(TOKEN_KEY)
    } catch {
      /* storage blocked: token lives for this page only */
    }
  },
}

const NETWORK: Bi = { ar: 'مفيش اتصال بالسيرفر. جرّبي تاني.', en: 'Could not reach the server. Please try again.' }

export async function api<T>(path: string, opts: { method?: string; body?: unknown; admin?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' }
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (opts.admin) {
    const t = adminToken.get()
    if (t) headers.authorization = `Bearer ${t}`
  }
  let r: Response
  try {
    r = await fetch(path, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, signal: opts.signal })
  } catch {
    throw new ApiError(0, 'network', NETWORK)
  }
  const isJson = (r.headers.get('content-type') ?? '').includes('json')
  const data = isJson ? await r.json().catch(() => undefined) : undefined
  if (!r.ok) {
    const e = (data as { error?: { code?: string; message?: Bi | string } & Record<string, unknown> } | undefined)?.error
    const msg = typeof e?.message === 'object' ? e.message : { ar: `حصل خطأ (${r.status}).`, en: e?.message || `Request failed (${r.status}).` }
    throw new ApiError(r.status, e?.code ?? 'http_' + r.status, msg, e ?? {})
  }
  return data as T
}
