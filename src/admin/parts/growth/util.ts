import type { Segment } from '../../../lib/metrics'

/** Real CSV download (UTF-8 with BOM so Excel reads Arabic). */
export function downloadCSV(filename: string, header: string[], rows: (string | number | undefined | null)[][]) {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? '' : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = String.fromCharCode(0xfeff) + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export const today = () => new Date().toISOString().slice(0, 10)

/** Egyptian mobile → international digits for wa.me (010… → 2010…). */
export function waNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) return d.slice(2)
  if (d.startsWith('20')) return d
  if (d.startsWith('0')) return `2${d}`
  return d
}

export function waLink(phone: string, text?: string) {
  return `https://wa.me/${waNumber(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full
}

export function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m))
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export function genCode(prefix = 'BRIGHT') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${s}`
}

/** Display order for RFM segments, best first, "no orders" last. */
export const SEGMENT_ORDER: Segment[] = ['champions', 'loyal', 'promising', 'at_risk', 'cant_lose', 'hibernating', 'new']

export const SEGMENT_TONE: Record<Segment, 'ok' | 'warn' | 'bad' | 'info' | 'hollow' | undefined> = {
  champions: 'ok',
  loyal: 'ok',
  promising: 'info',
  at_risk: 'warn',
  cant_lose: 'bad',
  hibernating: 'hollow',
  new: undefined,
}

/** Sequential heat colour: one hue mixed into the pane. t in 0..1 */
export function heat(t: number) {
  if (!(t > 0)) return { background: 'var(--pane-2)', color: 'var(--fg-3)' }
  const p = Math.round(10 + Math.min(1, t) * 85)
  return {
    background: `color-mix(in oklab, var(--gr-seq) ${p}%, var(--pane))`,
    color: p >= 55 ? 'var(--gr-seq-ink)' : 'var(--fg)',
  }
}

export const CONSUMABLE = new Set(['cleanser', 'toner', 'essence', 'serum', 'moisturizer', 'sunscreen', 'mask'])
