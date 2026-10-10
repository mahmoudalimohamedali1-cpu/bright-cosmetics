/** Deterministic PRNG (mulberry32) so demo data is identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DAY = 86400000

export function daysAgoISO(d: number, hour = 12) {
  const t = new Date(Date.now() - d * DAY)
  t.setHours(hour, 0, 0, 0)
  return t.toISOString()
}

export function daysFromNowISO(d: number) {
  return new Date(Date.now() + d * DAY).toISOString().slice(0, 10)
}

export function pickOne<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9)
}
