import type { ReactNode } from 'react'
import { asset } from '../lib/asset'
import type { Visual } from '../data/types'

/*
  Flat-ink container drawings, one per packaging shape. They stand in for
  product photography until the store's own shots exist: crisp geometry,
  the product's real packaging colors, its brand on the label.
*/

type Props = {
  visual: Visual
  brand: string
  size?: string
  className?: string
  /** Hide the label text (tiny thumbnails) */
  bare?: boolean
  title?: string
  /** Real packshot; when set it replaces the drawing */
  image?: string
}

const W = 200
const H = 260

export function ProductVisual({ visual, brand, size, className, bare, title, image }: Props) {
  if (image)
    return (
      <img
        src={asset(image)}
        alt={title ?? ''}
        className={`pv-img${className ? ` ${className}` : ''}`}
        // Small thumbnails (bare) load right away; big tiles wait until near the viewport
        loading={bare ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
    )
  const { shape, body, cap, label, text } = visual
  const g = geometry(shape)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMax meet"
      data-brand={brand}
    >
      <ellipse cx={100} cy={248} rx={g.shadowRx} ry={6} fill="#5b2e2b" opacity={0.12} />
      {g.draw(body, cap)}
      {g.label && (
        <g>
          <rect x={g.label.x} y={g.label.y} width={g.label.w} height={g.label.h} rx={2} fill={label} />
          {!bare && (
            <>
              {/* No brand wordmark on drawn packaging: these are stand-ins, not the brand's art */}
              <rect x={100 - g.label.w * 0.28} y={g.label.y + g.label.h * 0.3} width={g.label.w * 0.56} height={2} rx={1} fill={text} opacity={0.55} />
              {size && (
                <text
                  x={100}
                  y={g.label.y + g.label.h * 0.3 + g.label.fs * 1.6}
                  textAnchor="middle"
                  fontFamily="Readex Pro, system-ui, sans-serif"
                  fontSize={g.label.fs * 0.72}
                  fill={text}
                  opacity={0.75}
                >
                  {size}
                </text>
              )}
            </>
          )}
        </g>
      )}
      {/* single highlight stroke: light from the window side */}
      <rect x={g.hl.x} y={g.hl.y} width={4} height={g.hl.h} rx={2} fill="#ffffff" opacity={0.38} />
    </svg>
  )
}

type Geo = {
  draw: (body: string, cap: string) => ReactNode
  label?: { x: number; y: number; w: number; h: number; fs: number }
  hl: { x: number; y: number; h: number }
  shadowRx: number
}

function geometry(shape: Visual['shape']): Geo {
  switch (shape) {
    case 'dropper':
      return {
        draw: (b, c) => (
          <>
            <rect x={78} y={44} width={44} height={50} rx={22} fill={c} />
            <rect x={72} y={88} width={56} height={26} rx={4} fill={c} />
            <rect x={56} y={112} width={88} height={134} rx={16} fill={b} />
          </>
        ),
        label: { x: 64, y: 150, w: 72, h: 70, fs: 11 },
        hl: { x: 64, y: 122, h: 110 },
        shadowRx: 52,
      }
    case 'pump':
      return {
        draw: (b, c) => (
          <>
            <rect x={96} y={40} width={8} height={30} fill={c} />
            <rect x={70} y={34} width={44} height={14} rx={4} fill={c} />
            <rect x={60} y={38} width={16} height={6} rx={3} fill={c} />
            <rect x={78} y={66} width={44} height={34} rx={4} fill={c} />
            <rect x={52} y={98} width={96} height={148} rx={12} fill={b} />
          </>
        ),
        label: { x: 60, y: 140, w: 80, h: 76, fs: 11 },
        hl: { x: 60, y: 108, h: 128 },
        shadowRx: 56,
      }
    case 'jar':
      return {
        draw: (b, c) => (
          <>
            <rect x={36} y={150} width={128} height={96} rx={14} fill={b} />
            <rect x={30} y={116} width={140} height={40} rx={8} fill={c} />
          </>
        ),
        label: { x: 52, y: 172, w: 96, h: 54, fs: 12 },
        hl: { x: 44, y: 160, h: 76 },
        shadowRx: 72,
      }
    case 'pad':
      return {
        draw: (b, c) => (
          <>
            <rect x={30} y={160} width={140} height={86} rx={14} fill={b} />
            <rect x={24} y={128} width={152} height={38} rx={10} fill={c} />
          </>
        ),
        label: { x: 50, y: 180, w: 100, h: 50, fs: 12 },
        hl: { x: 38, y: 170, h: 66 },
        shadowRx: 78,
      }
    case 'tube':
      return {
        draw: (b, c) => (
          <>
            <path d="M52 30 H148 L132 206 H68 Z" fill={b} />
            <rect x={52} y={24} width={96} height={10} rx={2} fill={b} opacity={0.85} />
            <rect x={66} y={204} width={68} height={42} rx={6} fill={c} />
          </>
        ),
        label: { x: 68, y: 74, w: 64, h: 86, fs: 11 },
        hl: { x: 62, y: 40, h: 150 },
        shadowRx: 46,
      }
    case 'toner':
      return {
        draw: (b, c) => (
          <>
            <rect x={78} y={36} width={44} height={46} rx={6} fill={c} />
            <rect x={60} y={78} width={80} height={168} rx={12} fill={b} />
          </>
        ),
        label: { x: 66, y: 128, w: 68, h: 82, fs: 11 },
        hl: { x: 67, y: 88, h: 146 },
        shadowRx: 50,
      }
    case 'mask':
      return {
        draw: (b) => (
          <>
            <rect x={44} y={34} width={112} height={212} rx={6} fill={b} />
            <path
              d="M44 44 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8"
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.5}
              strokeWidth={2}
            />
          </>
        ),
        label: { x: 56, y: 96, w: 88, h: 96, fs: 12 },
        hl: { x: 52, y: 56, h: 176 },
        shadowRx: 60,
      }
    case 'cushion':
      return {
        draw: (b, c) => (
          <>
            <rect x={30} y={178} width={140} height={68} rx={30} fill={b} />
            <rect x={30} y={150} width={140} height={40} rx={20} fill={b} />
            <rect x={30} y={182} width={140} height={4} fill={c} />
          </>
        ),
        label: { x: 64, y: 198, w: 72, h: 34, fs: 11 },
        hl: { x: 44, y: 158, h: 22 },
        shadowRx: 74,
      }
    case 'tint':
      return {
        draw: (b, c) => (
          <>
            <rect x={84} y={34} width={32} height={76} rx={6} fill={c} />
            <rect x={80} y={106} width={40} height={140} rx={8} fill={b} />
          </>
        ),
        hl: { x: 86, y: 114, h: 120 },
        shadowRx: 26,
      }
  }
}
