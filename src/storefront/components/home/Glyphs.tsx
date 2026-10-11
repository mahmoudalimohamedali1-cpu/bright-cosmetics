import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

/*
  Bright's own small drawings: the ticker dot, the hand-drawn sparkle sticker,
  the jagged sunburst badge and the authenticity seal. All plum outlines on
  lilac, nothing borrowed.
*/

/** The Bright Cosmetics lockup: the round logo, then "Bright" in the logo's serif and "Cosmetics" in script. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`v-mark ${className ?? ''}`} aria-hidden="true">
      <img className="v-mark__logo" src="/brand/bright-logo-160.webp" alt="" width={160} height={160} decoding="async" />
      <span className="v-mark__words">
        <span className="v-mark__en">Bright</span>
        <span className="v-mark__script">Cosmetics</span>
      </span>
    </span>
  )
}

/** Ticker / marquee separator: a plum dot with a cream four-point glint. */
export function NuriDot({ size = 22 }: { size?: number }) {
  return (
    <svg className="v-dot" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="var(--plum)" />
      <path d="M12 4.5c.6 4.2 3.3 6.9 7.5 7.5-4.2.6-6.9 3.3-7.5 7.5-.6-4.2-3.3-6.9-7.5-7.5 4.2-.6 6.9-3.3 7.5-7.5Z" fill="var(--cream)" />
      <circle cx="17.6" cy="6.4" r="1.3" fill="var(--lilac)" />
    </svg>
  )
}

/** Hand-drawn sparkle with flicks around it; sits beside the hero headline. */
export function SparkSticker({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g fill="none" stroke="var(--plum)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M58 14c3 18 9 30 30 37-20 5-27 15-31 39-4-22-12-32-33-37 21-6 30-17 34-39Z"
          fill="var(--lilac)"
        />
        <path d="M93 18l-6 9M104 34l-10 3M22 26l8 8M100 78l-9-4" />
        <path d="M86 92c4 1 7 4 8 8" />
        <circle cx="44" cy="44" r="2.4" fill="var(--plum)" stroke="none" />
      </g>
    </svg>
  )
}

/** Points of a jagged sunburst around (cx, cy). */
function burst(cx: number, cy: number, rOut: number, rIn: number, n: number) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

/** Lilac sunburst sticker badge with a short label in the middle. */
export function BurstBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`v-burst ${className ?? ''}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <polygon points={burst(50, 50, 48, 40, 18)} fill="var(--lilac)" stroke="var(--plum)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="v-burst__t">{children}</span>
    </span>
  )
}

/** The authenticity seal: sunburst edge, ring of small type, big "أصلي" in the middle. */
export function AuthSeal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 400" role="img" aria-label="100% أصلي — 100% authentic">
      <defs>
        <path id="v-seal-ring" d="M200,200 m-128,0 a128,128 0 1,1 256,0 a128,128 0 1,1 -256,0" />
      </defs>
      <g className="v-seal__spin">
        <polygon points={burst(200, 200, 196, 172, 32)} fill="var(--lilac)" stroke="var(--plum)" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="200" cy="200" r="160" fill="none" stroke="var(--plum)" strokeWidth="2" />
        <circle cx="200" cy="200" r="104" fill="var(--cream)" stroke="var(--plum)" strokeWidth="3" />
        <text className="v-seal__ring" fill="var(--plum)">
          <textPath href="#v-seal-ring" startOffset="0" textLength="796" lengthAdjust="spacing">
            100% AUTHENTIC ✦ LOT ON EVERY UNIT ✦ SEOUL TO CAIRO ✦
          </textPath>
        </text>
      </g>
      <text x="200" y="196" textAnchor="middle" className="v-seal__ar" fill="var(--plum)">أصلي</text>
      <text x="200" y="250" textAnchor="middle" className="v-seal__pct" fill="var(--lilac-700)">100%</text>
      <path d="M150 268c30 10 70 10 100 0" fill="none" stroke="var(--plum)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** TikTok has no lucide icon; a simple note-shaped glyph in the same stroke style. */
export function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M9.5 11.5a4 4 0 1 0 4 4V3c.6 2.8 2.7 4.8 5.5 5.2" />
    </svg>
  )
}

/** lucide 1.x dropped brand icons; simple stroke versions in the same style. */
export function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  )
}
export function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6.5v3.5H9V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15Z" />
    </svg>
  )
}

/** The lemon elliptical pill: the one call to action per viewport. */
export function Pill({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`v-pill ${className ?? ''}`}>
      <span className="v-pill__t">{children}</span>
      <ArrowRight size={20} strokeWidth={1.75} className="v-flip" aria-hidden="true" />
    </Link>
  )
}
