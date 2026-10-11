import type { ReactNode } from 'react'
import { NuriDot } from './Glyphs'

/*
  An endless strip. One static, visually hidden list for assistive tech; the
  moving copies are aria-hidden. Two identical groups slide by -50% (LTR) or
  +50% (RTL) so the loop is seamless. Hover pauses, reduced motion stops.
*/

type Props = {
  items: string[]
  label: string
  className?: string
  icon?: ReactNode
  /** Copies of the item list inside one group, so a group is wider than the screen. */
  repeat?: number
  /** Seconds for one full loop. */
  speed?: number
}

export function Marquee({ items, label, className, icon = <NuriDot />, repeat = 3, speed = 40 }: Props) {
  const group = Array.from({ length: repeat }, () => items).flat()
  const renderGroup = (k: string) => (
    <div className="v-marquee__group" key={k}>
      {group.map((t, i) => (
        <span className="v-marquee__item" key={i}>
          <span>{t}</span>
          {icon}
        </span>
      ))}
    </div>
  )
  return (
    <div className={`v-marquee ${className ?? ''}`} style={{ ['--v-speed' as string]: `${speed}s` }}>
      <ul className="sr-only" aria-label={label}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="v-marquee__track" aria-hidden="true">
        {renderGroup('a')}
        {renderGroup('b')}
      </div>
    </div>
  )
}
