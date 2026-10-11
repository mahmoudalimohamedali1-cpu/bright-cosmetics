import type { CSSProperties } from 'react'
import { asset } from '../../../lib/asset'
import type { Product } from '../../../data/types'

/*
  A styled group of the store's own packshots: the tallest in the middle,
  the rest stepping down and tucking in behind it, on a soft blush pedestal.
  Used wherever the page used to show a lifestyle photo, so the products
  themselves carry the page.
*/

export function ProductGroup({ products, className, size = 'lg' }: { products: Product[]; className?: string; size?: 'lg' | 'md' | 'sm' }) {
  const shots = products.filter((p) => p.image).slice(0, size === 'lg' ? 5 : 3)
  // Centre-out order: middle item first in z-order, then alternate left/right
  const n = shots.length
  const mid = Math.floor(n / 2)
  return (
    <div className={`v-pg v-pg--${size} ${className ?? ''}`} aria-hidden="true">
      <div className="v-pg__row">
        {shots.map((p, i) => {
          const d = Math.abs(i - mid)
          const style = {
            ['--d' as string]: d,
            ['--i' as string]: i,
            zIndex: 10 - d,
          } as CSSProperties
          return (
            <span key={p.id} className="v-pg__item" style={style}>
              <img src={asset(p.image)} alt="" loading={size === 'lg' ? 'eager' : 'lazy'} decoding="async" draggable={false} />
            </span>
          )
        })}
      </div>
      <span className="v-pg__floor" />
    </div>
  )
}
