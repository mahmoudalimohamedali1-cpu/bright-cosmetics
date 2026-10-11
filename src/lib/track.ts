import { apiAvailable } from './api'

/*
  First-party storefront events for the admin Live view and funnel. No cookies,
  no third parties: a random id in sessionStorage groups one visit's events.
  Skipped entirely when the browser sends Do Not Track or there is no API.
*/

export type TrackType = 'view' | 'product_view' | 'add_to_cart' | 'checkout_start' | 'purchase'

const KEY = 'nuri-session'

function sessionId() {
  try {
    let s = sessionStorage.getItem(KEY)
    if (!s) {
      s = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '').slice(0, 24)
      sessionStorage.setItem(KEY, s)
    }
    return s
  } catch {
    return undefined
  }
}

function dnt() {
  return typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || (window as { doNotTrack?: string }).doNotTrack === '1')
}

let referrerSent = false

export function track(type: TrackType, extra: { productId?: string; value?: number } = {}) {
  if (typeof window === 'undefined' || dnt()) return
  const session = sessionId()
  if (!session) return
  const meta: Record<string, string> = {}
  if (!referrerSent && type === 'view') {
    referrerSent = true
    try {
      if (document.referrer && new URL(document.referrer).host !== location.host) meta.ref = new URL(document.referrer).host
    } catch {
      /* ignore */
    }
    const utm = new URLSearchParams(location.search).get('utm_source')
    if (utm) meta.utm = utm.slice(0, 40)
  }
  const payload = JSON.stringify({ session, type, path: location.pathname, productId: extra.productId, value: extra.value, meta })
  void apiAvailable().then((up) => {
    if (!up) return
    const blob = new Blob([payload], { type: 'application/json' })
    if (navigator.sendBeacon?.('/api/events', blob)) return
    fetch('/api/events', { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {})
  })
}
