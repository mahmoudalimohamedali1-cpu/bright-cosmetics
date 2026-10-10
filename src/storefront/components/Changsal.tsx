import { useId } from 'react'
import type { CSSProperties } from 'react'

/*
  An ah-ja (亞) changsal screen. Each tile is a cross of five small panes
  (centre + four arms); where four tiles meet they leave one large open pane.
  Every muntin connects, as in a real screen. `cell` is the tile size in px
  and should be a multiple of 48 so the panes stay on the 8px module.
*/
export function Changsal({
  cell = 144,
  stroke = 'currentColor',
  width = 2,
  className,
  style,
}: {
  cell?: number
  stroke?: string
  width?: number
  className?: string
  style?: CSSProperties
}) {
  const id = `cs${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const u = cell / 6
  const d = [
    // cross outline
    `M${2 * u} 0 H${4 * u} V${2 * u} H${6 * u} V${4 * u} H${4 * u} V${6 * u} H${2 * u} V${4 * u} H0 V${2 * u} H${2 * u} Z`,
    // centre pane
    `M${2 * u} ${2 * u} H${4 * u} V${4 * u} H${2 * u} Z`,
  ].join(' ')
  return (
    <svg className={className} style={style} width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse" x="50%" y="0">
          <path d={d} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="square" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
