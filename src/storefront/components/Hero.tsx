import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { Medallion } from '../../components/Lattice'
import { Changsal } from './Changsal'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stepCategoryOk, useActiveProducts } from '../lib'

/*
  The first viewport: a lacquer field, a lattice window of lit paper panes
  with five bestsellers standing behind it, and a light that follows the
  pointer. The light casts the lattice across the headline.

  Light position lives in CSS vars (--lx/--ly, percent of the window) written
  once per animation frame; everything else is CSS.
*/

type Time = 'am' | 'pm'
const REST: Record<Time, [number, number]> = { am: [26, 18], pm: [84, 74] }

function initialTime(): Time {
  const h = new Date().getHours()
  return h >= 5 && h < 17 ? 'am' : 'pm'
}

export function Hero() {
  const { tx, pick } = useI18n()
  const [time, setTime] = useState<Time>(initialTime)
  const hero = useRef<HTMLElement>(null)
  const win = useRef<HTMLDivElement>(null)
  const pos = useRef<[number, number] | null>(null)
  const products = useActiveProducts()

  // Five bestsellers for this light: morning products by day, night products by dusk.
  const lineup = useMemo(() => {
    const pool = products
      .filter((p) => p.routineTime.includes(time) && stepCategoryOk(p))
      .sort((a, b) => b.reviewCount - a.reviewCount)
    const picked: typeof pool = []
    const steps = new Set<number>()
    for (const p of pool) {
      if (picked.length >= 5) break
      if (steps.has(p.routineStep) && pool.length > 8) continue
      steps.add(p.routineStep)
      picked.push(p)
    }
    for (const p of pool) if (picked.length < 5 && !picked.includes(p)) picked.push(p)
    return picked.sort((a, b) => a.routineStep - b.routineStep)
  }, [products, time])

  // Pointer-driven light (fine pointers, motion allowed). Coarse pointers get a CSS drift.
  useEffect(() => {
    const el = hero.current
    const w = win.current
    if (!el || !w) return
    const [rx, ry] = REST[time]
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    const animate = !reduce && fine
    // Ease from wherever the light was (e.g. after the AM/PM switch).
    let [cx, cy] = animate && pos.current ? pos.current : [rx, ry]
    let tx = rx
    let ty = ry
    let raf = 0
    const write = () => {
      pos.current = [cx, cy]
      el.style.setProperty('--lx', `${cx.toFixed(2)}%`)
      el.style.setProperty('--ly', `${cy.toFixed(2)}%`)
      // Shadow is cast away from the light, scaled to a few module steps.
      el.style.setProperty('--sx', `${((50 - cx) * 0.64).toFixed(1)}px`)
      el.style.setProperty('--sy', `${((50 - cy) * 0.4).toFixed(1)}px`)
    }
    write()
    if (!animate) return
    const tick = () => {
      cx += (tx - cx) * 0.12
      cy += (ty - cy) * 0.12
      write()
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(tick)
      else raf = 0
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      const r = w.getBoundingClientRect()
      tx = Math.max(-20, Math.min(120, ((e.clientX - r.left) / r.width) * 100))
      ty = Math.max(-20, Math.min(120, ((e.clientY - r.top) / r.height) * 100))
      kick()
    }
    const onLeave = () => {
      tx = rx
      ty = ry
      kick()
    }
    kick()
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [time])

  return (
    <section className="sf-hero" ref={hero} data-time={time} aria-labelledby="sf-hero-h">
      <div className="sf-hero__inner sf-wrap">
        <div className="sf-hero__stage">
          <div className="sf-window" ref={win}>
            <div className="sf-window__light" aria-hidden="true" />
            <ul className="sf-window__shelf" aria-label={time === 'am' ? tx('الأكثر مبيعًا لروتين الصبح', 'Morning routine bestsellers') : tx('الأكثر مبيعًا لروتين الليل', 'Evening routine bestsellers')}>
              {lineup.map((p) => (
                <li key={p.id}>
                  <Link to={`/p/${p.slug}`} className="sf-window__item" aria-label={`${p.brand}: ${pick(p.name)}`}>
                    <ProductVisual visual={p.visual} brand={p.brand} bare />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="sf-window__lattice" aria-hidden="true">
              <Changsal cell={192} stroke="var(--lacquer-800)" width={4} />
            </div>
            <svg className="sf-window__medal" width="100%" height="100%" aria-hidden="true" focusable="false">
              <Medallion stroke="var(--lacquer-800)" width={4} size={136} />
            </svg>
          </div>
          <div className="sf-sill">
            <div className="sf-switch" role="radiogroup" aria-label={tx('نور الروتين', 'Routine light')}>
              <button type="button" role="radio" aria-checked={time === 'am'} className="sf-switch__opt" onClick={() => setTime('am')}>
                <Sun size={16} aria-hidden="true" />
                {tx('روتين الصبح', 'Morning')}
              </button>
              <button type="button" role="radio" aria-checked={time === 'pm'} className="sf-switch__opt" onClick={() => setTime('pm')}>
                <Moon size={16} aria-hidden="true" />
                {tx('روتين الليل', 'Evening')}
              </button>
            </div>
          </div>
        </div>

        <div className="sf-hero__copy">
          <div className="sf-cast" aria-hidden="true">
            <div className="sf-cast__pool" />
            <div className="sf-cast__lattice">
              <Changsal cell={192} stroke="var(--lacquer-950)" width={10} />
            </div>
          </div>
          <h1 id="sf-hero-h" className="sf-hero__h">{tx('بشرة بتنوّر من جوّه', 'Skin that glows from within')}</h1>
          <p className="sf-hero__lede">
            {tx(
              'منتجات كورية ومستوردة أصلية، مختارة على نوع بشرتك، وكل عبوة عليها رقم التشغيلة وتاريخ الصلاحية.',
              'Authentic Korean and imported skincare matched to your skin, with the lot number and expiry on every unit.',
            )}
          </p>
          <div className="sf-hero__actions">
            <Link to="/routine" className="sf-btn sf-btn--brass sf-btn--lg">
              {tx('تسوقي روتينك', 'Shop your routine')}
            </Link>
            <Link to="/routine" className="sf-hero__second">
              {tx('اعرفي نوع بشرتك', 'Find your skin type')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
