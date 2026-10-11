import { useRef } from 'react'
import { clamp01, reducedMotion, useScrollFrame } from './scroll'

/*
  A heading whose words fill from faded to solid as it scrolls up the
  screen. Progress lives in one CSS var (--fill, 0..word count); each word
  computes its own opacity from its index. Reduced motion: solid.
*/

export function ScrollFillHeading({ text, id, className }: { text: string; id?: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const words = text.split(' ')
  const motion = !reducedMotion()

  useScrollFrame(({ vh }) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // 0 when the heading's top enters at 92% of the viewport, 1 when it reaches 38%.
    const p = clamp01((vh * 0.92 - r.top) / (vh * 0.54))
    el.style.setProperty('--fill', (p * (words.length + 1)).toFixed(3))
  }, motion)

  return (
    <h2 ref={ref} id={id} className={`v-fill ${motion ? 'is-live' : ''} ${className ?? ''}`}>
      {words.map((w, i) => (
        <span key={i} className="v-fill__w" style={{ ['--i' as string]: i }}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </h2>
  )
}
