import { useId } from 'react'
import type { CSSProperties } from 'react'

/*
  The lattice. A Korean ah-ja (亞) changsal pane tiled into a screen, the same
  grammar a mashrabiya uses to filter light. Used as the hero window, as the
  shadow it casts, and as a quiet frame motif.

  `cell` is the repeat in px; every value is a multiple of the 8px module.
*/

type Props = {
  cell?: number
  stroke?: string
  width?: number
  className?: string
  /** Draw the girih star medallion at the centre of the screen */
  medallion?: boolean
  style?: CSSProperties
}

export function LatticePattern({ cell = 64, stroke = 'currentColor', width = 2, className, medallion, style }: Props) {
  const id = useId().replace(/:/g, '')
  const u = cell / 6
  return (
    <svg className={className} style={style} width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`aja-${id}`} width={cell} height={cell} patternUnits="userSpaceOnUse">
          {/* 亞 cross of five panes; four tiles meeting leave one large open pane */}
          <path
            d={`M${2 * u} 0 H${4 * u} V${2 * u} H${6 * u} V${4 * u} H${4 * u} V${6 * u} H${2 * u} V${4 * u} H0 V${2 * u} H${2 * u} Z M${2 * u} ${2 * u} H${4 * u} V${4 * u} H${2 * u} Z`}
            fill="none"
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="square"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#aja-${id})`} />
      {medallion && <Medallion stroke={stroke} width={width} />}
    </svg>
  )
}

/** Eight-point girih star, where the Korean grid meets the Arab one. */
export function Medallion({ stroke = 'currentColor', width = 2, size = 160 }: { stroke?: string; width?: number; size?: number }) {
  const square = (rot: number) =>
    Array.from({ length: 4 }, (_, i) => {
      const t = ((i * 90 + rot) * Math.PI) / 180
      return `${(50 + 50 * Math.cos(t)).toFixed(2)},${(50 + 50 * Math.sin(t)).toFixed(2)}`
    }).join(' ')
  return (
    <svg x="50%" y="50%" width={size} height={size} viewBox="0 0 100 100" overflow="visible" style={{ transform: `translate(${-size / 2}px, ${-size / 2}px)` }} aria-hidden="true">
      <polygon points={square(0)} fill="var(--paper-lit)" stroke={stroke} strokeWidth={width} vectorEffect="non-scaling-stroke" />
      <polygon points={square(45)} fill="var(--paper-lit)" stroke={stroke} strokeWidth={width} vectorEffect="non-scaling-stroke" />
      <circle cx={50} cy={50} r={18} fill="none" stroke={stroke} strokeWidth={width} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** The Bright mark: one lit pane inside the 亞 lattice, a brass point of light. */
export function NuriMark({ size = 32, frame = 'var(--lacquer-800)', pane = 'var(--paper)', light = 'var(--brass)' }: { size?: number; frame?: string; pane?: string; light?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill={frame} />
      <rect x="10" y="10" width="44" height="44" fill={pane} />
      <path d="M24 10v14H10M40 10v14h14M10 40h14v14M54 40H40v14M24 24h16v16H24z" fill="none" stroke={frame} strokeWidth="3" />
      <circle cx="32" cy="32" r="4" fill={light} />
    </svg>
  )
}
