import { asset } from '../../../lib/asset'
import type { HomeBlock, Product } from '../../../data/types'
import { ProductVisual } from '../../../components/ProductVisual'
import { useI18n } from '../../../i18n'
import { Pill } from './Glyphs'
import { ProductCard } from '../ProductCard'

type Panel = Extract<HomeBlock, { type: 'panel' }>

function shots(products: Product[], slugs: string[], n: number) {
  const picked = slugs.map((s) => products.find((p) => p.slug === s)).filter((p): p is Product => !!p)
  const pool = picked.length ? picked : products.filter((p) => p.image)
  return pool.slice(0, n)
}

function Shot({ p, eager }: { p: Product; eager?: boolean }) {
  if (p.image) return <img src={asset(p.image)} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
  return <ProductVisual image={p.image} visual={p.visual} brand={p.brand} />
}

export function ShapedSection({ block, products }: { block: Panel; products: Product[] }) {
  const { pick } = useI18n()
  const title = pick(block.title)
  const sub = pick(block.sub)
  const body = pick(block.body)
  const cta = pick(block.cta)
  const href = block.href || '/shop'
  const id = `h-${block.id}`
  const items = block.items.map((it) => ({ id: it.id, title: pick(it.title), body: pick(it.body) })).filter((it) => it.title || it.body)
  const buy = cta && href ? <Pill to={href}>{cta}</Pill> : null

  if (block.shape === 'statement') {
    if (!title) return null
    return (
      <section className="v-shape v-shape--statement" aria-labelledby={id}>
        <div className="v-wrap">
          <h2 id={id} className="v-shape__giant">{title}</h2>
        </div>
      </section>
    )
  }

  if (block.shape === 'banner' || block.shape === 'poster' || block.shape === 'cta') {
    if (!title && !sub) return null
    return (
      <section className={`v-shape v-shape--${block.shape}`} aria-labelledby={title ? id : undefined}>
        <div className="v-wrap v-shape__center">
          {title && <h2 id={id} className="v-h2">{title}</h2>}
          {sub && <p className="v-shape__sub">{sub}</p>}
          {buy}
        </div>
      </section>
    )
  }

  if (block.shape === 'editorial') {
    if (!title && !body) return null
    return (
      <section className="v-shape v-shape--editorial" aria-labelledby={title ? id : undefined}>
        <div className="v-wrap v-shape__measure">
          {title && <h2 id={id} className="v-h2">{title}</h2>}
          {body && <p className="v-shape__body">{body}</p>}
        </div>
      </section>
    )
  }

  if (block.shape === 'quote') {
    if (!body) return null
    return (
      <section className="v-shape v-shape--quote" aria-labelledby={id}>
        <div className="v-wrap v-shape__center">
          <blockquote>
            <p id={id} className="v-shape__quote">{body}</p>
          </blockquote>
          {title && <p className="v-shape__by">{title}</p>}
        </div>
      </section>
    )
  }

  if (block.shape === 'claims') {
    if (!items.length) return null
    return (
      <section className="v-shape v-shape--claims" aria-label={title || undefined}>
        <ul className="v-shape__claims">
          {items.map((it) => (
            <li key={it.id}>{it.title}</li>
          ))}
        </ul>
      </section>
    )
  }

  if (block.shape === 'columns' || block.shape === 'list' || block.shape === 'steps') {
    if (!items.length && !title) return null
    return (
      <section className={`v-shape v-shape--${block.shape}`} aria-labelledby={title ? id : undefined}>
        <div className="v-wrap">
          {title && <h2 id={id} className="v-h2 v-shape__h">{title}</h2>}
          <ul className="v-shape__items">
            {items.map((it) => (
              <li key={it.id}>
                {it.title && <h3>{it.title}</h3>}
                {it.body && <p>{it.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  const list = shots(products, block.slugs, block.shape === 'feature' || block.shape === 'duo' ? 2 : block.shape === 'mosaic' ? 5 : 8)
  if ((block.shape === 'feature' || block.shape === 'duo' || block.shape === 'mosaic') && !list.length && !title) return null

  if (block.shape === 'feature') {
    const p = list[0]
    return (
      <section className="v-shape v-shape--feature" aria-labelledby={title ? id : undefined}>
        <div className="v-wrap v-shape__split">
          <div className="v-shape__media">{p && <Shot p={p} eager />}</div>
          <div className="v-shape__copy">
            {title && <h2 id={id} className="v-h2">{title}</h2>}
            {body && <p className="v-shape__body">{body}</p>}
            {buy}
          </div>
        </div>
      </section>
    )
  }

  if (block.shape === 'duo') {
    if (!list.length) return null
    return (
      <section className="v-shape v-shape--duo" aria-labelledby={title ? id : undefined}>
        <div className="v-wrap">
          {title && <h2 id={id} className="v-h2 v-shape__h">{title}</h2>}
          <ul className="v-shape__duo">
            {list.slice(0, 2).map((p) => (
              <li key={p.id}>
                <ProductCard p={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  if (block.shape === 'mosaic') {
    if (!list.length && !title) return null
    return (
      <section className="v-shape v-shape--mosaic" aria-labelledby={title ? id : undefined}>
        <div className="v-wrap">
          {title && <h2 id={id} className="v-h2 v-shape__h">{title}</h2>}
          <ul className="v-shape__mosaic">
            {list.map((p) => (
              <li key={p.id}>
                <Shot p={p} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  if (block.shape === 'shelf') {
    if (!list.length) return null
    return (
      <section className="v-shape v-shape--shelf" aria-labelledby={title ? id : undefined}>
        <div className="v-wrap v-shape__head">
          <div>
            {title && <h2 id={id} className="v-h2">{title}</h2>}
            {sub && <p className="v-shape__sub">{sub}</p>}
          </div>
          {buy}
        </div>
        <ul className="v-grid">
          {list.map((p) => (
            <li key={p.id} className="v-grid__cell">
              <ProductCard p={p} />
            </li>
          ))}
        </ul>
      </section>
    )
  }

  const flipped = block.shape === 'split-flip'
  return (
    <section className="v-shape v-shape--split" aria-labelledby={title ? id : undefined}>
      <div className="v-wrap v-shape__split">
        {flipped ? null : <div className="v-shape__media"><Group shots={list} /></div>}
        <div className="v-shape__copy">
          {title && <h2 id={id} className="v-h2">{title}</h2>}
          {body && <p className="v-shape__body">{body}</p>}
          {buy}
        </div>
        {flipped ? <div className="v-shape__media"><Group shots={list} /></div> : null}
      </div>
    </section>
  )
}

function Group({ shots: list }: { shots: Product[] }) {
  return (
    <ul className="v-shape__bottles">
      {list.slice(0, 3).map((p) => (
        <li key={p.id}>
          <Shot p={p} />
        </li>
      ))}
    </ul>
  )
}
