import { useEffect, useSyncExternalStore } from 'react'
import { useI18n } from '../../../i18n'
import { PHOTOS } from '../../media'
import { reducedMotion } from './scroll'

/*
  The entrance. A full-screen lilac sheet; the Bright wordmark draws itself in
  outline; then the sheet wipes away on a diagonal, revealing the hero photo
  while the headline slides in. Plays on the first visit to the home page,
  waits (briefly) for the display font and the hero photo so the reveal never
  uncovers a half-loaded page. Once per browser session; never on a language
  switch. Reduced motion: skipped.
*/

const KEY = 'nuri-intro-played'
let played = (() => {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
})()

const DRAW_MS = 1150
const WIPE_MS = 900
/** How long the hero waits before its own entrance, so it starts mid-wipe. */
export const INTRO_HOLD_MS = DRAW_MS + 320

type Phase = 'off' | 'draw' | 'wipe'

/*
  The sequence lives outside React: once started it always runs to the end,
  so a remount of the home page (data arriving, StrictMode, route changes)
  can never cancel the reveal and leave the sheet stuck on screen.
*/
let phase: Phase | null = null
let started = false
const listeners = new Set<() => void>()
const getPhase = (): Phase => {
  if (phase === null) phase = played || reducedMotion() ? 'off' : 'draw'
  return phase
}
const setPhase = (p: Phase) => {
  phase = p
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

function startIntro() {
  if (started || getPhase() !== 'draw') return
  started = true
  played = true
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked */
  }
  const root = document.documentElement
  root.classList.add('v-intro')
  root.style.overflow = 'hidden'
  const timeout = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const font = document.fonts?.load('900 120px Fraunces').catch(() => undefined) ?? Promise.resolve()
  const img = new Promise<void>((res) => {
    const i = new Image()
    i.onload = i.onerror = () => res()
    i.src = PHOTOS.hero.src(1600)
  })
  ;(async () => {
    await Promise.race([font, timeout(700)])
    await Promise.all([timeout(DRAW_MS), Promise.race([img, timeout(1800)])])
    root.classList.add('v-intro--go')
    setPhase('wipe')
    await timeout(WIPE_MS)
    root.style.overflow = ''
    root.classList.remove('v-intro', 'v-intro--go')
    setPhase('off')
  })()
}

export function useIntro() {
  const p = useSyncExternalStore(subscribe, getPhase, getPhase)
  useEffect(() => {
    startIntro()
  }, [])
  return p
}

export function Preloader({ phase }: { phase: 'off' | 'draw' | 'wipe' }) {
  const { tx } = useI18n()
  if (phase === 'off') return null
  return (
    <div className={`v-pre ${phase === 'wipe' ? 'is-wiping' : ''}`} role="status" aria-label={tx('بيحمّل', 'Loading')}>
      <svg className="v-pre__mark" viewBox="0 0 800 260" aria-hidden="true" focusable="false">
        <text x="400" y="150" textAnchor="middle" className="v-pre__en">
          BRIGHT
        </text>
        <text x="400" y="232" textAnchor="middle" className="v-pre__ar">
          برايت
        </text>
      </svg>
    </div>
  )
}
