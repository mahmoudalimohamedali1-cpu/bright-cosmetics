import { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { PHOTOS } from '../../media'
import { reducedMotion } from './scroll'

/*
  The entrance. A full-screen lilac sheet; the NURI wordmark draws itself in
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

export function useIntro() {
  const [phase, setPhase] = useState<'off' | 'draw' | 'wipe'>(() => (played || reducedMotion() ? 'off' : 'draw'))
  useEffect(() => {
    if (phase !== 'draw') return
    played = true
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* storage blocked */
    }
    const root = document.documentElement
    root.classList.add('v-intro')
    root.style.overflow = 'hidden'

    let cancelled = false
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
      if (cancelled) return
      root.classList.add('v-intro--go')
      setPhase('wipe')
      await timeout(WIPE_MS)
      if (cancelled) return
      root.style.overflow = ''
      root.classList.remove('v-intro', 'v-intro--go')
      setPhase('off')
    })()

    return () => {
      cancelled = true
      root.style.overflow = ''
      root.classList.remove('v-intro', 'v-intro--go')
    }
  }, [phase])
  return phase
}

export function Preloader({ phase }: { phase: 'off' | 'draw' | 'wipe' }) {
  const { tx } = useI18n()
  if (phase === 'off') return null
  return (
    <div className={`v-pre ${phase === 'wipe' ? 'is-wiping' : ''}`} role="status" aria-label={tx('بيحمّل', 'Loading')}>
      <svg className="v-pre__mark" viewBox="0 0 600 260" aria-hidden="true" focusable="false">
        <text x="300" y="150" textAnchor="middle" className="v-pre__en">
          NURI
        </text>
        <text x="300" y="232" textAnchor="middle" className="v-pre__ar">
          نوري
        </text>
      </svg>
    </div>
  )
}
