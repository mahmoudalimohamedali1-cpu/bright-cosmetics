import { useEffect, useRef } from 'react'

/*
  One scroll loop for the whole storefront. A single passive scroll/resize
  listener schedules one requestAnimationFrame; every subscriber (header
  state, hero shrink, heading fill, spin band) reads layout and writes CSS
  vars inside that same frame.
*/

type Frame = { y: number; vh: number; vw: number }
type Sub = (f: Frame) => void

const subs = new Set<Sub>()
let queued = false
let bound = false

function run() {
  queued = false
  const f: Frame = { y: window.scrollY, vh: window.innerHeight, vw: document.documentElement.clientWidth }
  subs.forEach((s) => s(f))
}

function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(run)
}

function bind() {
  if (bound) return
  bound = true
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule, { passive: true })
}

function unbind() {
  if (!bound || subs.size) return
  bound = false
  window.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
}

export function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Subscribe to the shared frame. The callback is held in a ref so callers can
 * pass an inline function. Pass `enabled=false` to skip (e.g. reduced motion).
 */
export function useScrollFrame(cb: Sub, enabled = true) {
  const ref = useRef(cb)
  useEffect(() => {
    ref.current = cb
  })
  useEffect(() => {
    if (!enabled) return
    const sub: Sub = (f) => ref.current(f)
    subs.add(sub)
    bind()
    schedule()
    return () => {
      subs.delete(sub)
      unbind()
    }
  }, [enabled])
}

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)
