import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import type { Category, Concern, Origin, Product, SkinType } from '../../data/types'
import { CATEGORY_LABEL, CONCERN_LABEL, SKIN_LABEL, STEP_LABEL, originName } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { stockOf } from '../../store'
import { Door } from '../components/Door'
import { ProductPanes } from '../components/ProductCard'
import { Arrow, Sticker } from '../components/bits'
import { ALL_ORIGINS, CATEGORIES, IMPORTED_ORIGINS, brandSlug, useActiveProducts, useBrands, useTitle } from '../lib'

const SKINS: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']
const CONCERNS: Concern[] = ['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness', 'sun', 'barrier']
const PRICES = [
  { id: 'u500', min: 0, max: 500 },
  { id: '500-1000', min: 500, max: 1000 },
  { id: '1000-2000', min: 1000, max: 2000 },
  { id: '2000', min: 2000, max: Infinity },
]
type SortKey = 'featured' | 'best' | 'price-asc' | 'price-desc' | 'new' | 'rating'
const SORTS: SortKey[] = ['featured', 'best', 'price-asc', 'price-desc', 'new', 'rating']

const LIST_KEYS = ['cat', 'brand', 'skin', 'concern', 'origin', 'step'] as const
type ListKey = (typeof LIST_KEYS)[number]

function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ْ]/g, '')
    .toLowerCase()
}

function matchesQuery(p: Product, q: string) {
  const hay = norm(
    [
      p.brand,
      p.name.ar,
      p.name.en,
      p.short.en,
      p.short.ar,
      CATEGORY_LABEL[p.category].ar,
      CATEGORY_LABEL[p.category].en,
      p.category,
      ...p.ingredients.flatMap((i) => [i.ar, i.en]),
      ...p.concerns.flatMap((c) => [CONCERN_LABEL[c].ar, CONCERN_LABEL[c].en]),
    ].join(' '),
  )
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}

export default function Shop() {
  const { tx, pick, num, money } = useI18n()
  const products = useActiveProducts()
  const brands = useBrands()
  const { category: routeCat, brand: routeBrand } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const q = params.get('q')?.trim() ?? ''

  const brandName = routeBrand ? brands.find(([b]) => brandSlug(b) === routeBrand)?.[0] : undefined

  // Effective filter lists: route scope + query params.
  const lists = useMemo(() => {
    const get = (k: ListKey) => (params.get(k) ?? '').split(',').filter(Boolean)
    const cat = new Set(get('cat'))
    if (routeCat && (CATEGORIES as string[]).includes(routeCat)) cat.add(routeCat)
    const brand = new Set(get('brand'))
    if (brandName) brand.add(brandName)
    return {
      cat: [...cat],
      brand: [...brand],
      skin: get('skin'),
      concern: get('concern'),
      origin: get('origin'),
      step: get('step'),
    } satisfies Record<ListKey, string[]>
  }, [params, routeCat, brandName])
  const price = PRICES.find((p) => p.id === params.get('price'))
  const stockOnly = params.get('stock') === '1'
  const sort = (SORTS.includes(params.get('sort') as SortKey) ? params.get('sort') : 'featured') as SortKey

  /** Write filters back to the URL. Route scopes fold into query params once changed. */
  const commit = (next: Partial<Record<ListKey, string[]>>, extra?: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    const merged = { ...lists, ...next }
    for (const k of LIST_KEYS) if (merged[k].length) sp.set(k, merged[k].join(','))
    const base: Record<string, string | null> = { price: params.get('price'), stock: params.get('stock'), sort: params.get('sort') }
    for (const [k, v] of Object.entries({ ...base, ...extra })) if (v) sp.set(k, v)
    const path = q ? '/search' : '/shop'
    // Keep the pretty route when only that one scope is set.
    const keys = [...sp.keys()]
    if (!q && keys.length === 1 && keys[0] === 'cat' && merged.cat.length === 1) return navigate(`/shop/${merged.cat[0]}`, { replace: true })
    if (!q && keys.length === 1 && keys[0] === 'brand' && merged.brand.length === 1) return navigate(`/brand/${brandSlug(merged.brand[0])}`, { replace: true })
    navigate(`${path}${sp.toString() ? `?${sp.toString()}` : ''}`, { replace: true })
  }
  const toggle = (k: ListKey, v: string) => {
    const cur = lists[k]
    commit({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }
  const clearAll = () => navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/shop', { replace: true })

  const results = useMemo(() => {
    let r = products.filter((p) => {
      if (q && !matchesQuery(p, q)) return false
      if (lists.cat.length && !lists.cat.includes(p.category)) return false
      if (lists.brand.length && !lists.brand.includes(p.brand)) return false
      if (lists.skin.length && !lists.skin.some((s) => p.skinTypes.includes(s as SkinType))) return false
      if (lists.concern.length && !lists.concern.some((c) => p.concerns.includes(c as Concern))) return false
      if (lists.origin.length && !lists.origin.includes(p.origin)) return false
      if (lists.step.length && !(lists.step.includes(String(p.routineStep)) && p.category !== 'lip' && p.category !== 'makeup' && p.category !== 'hair')) return false
      if (price && (p.price < price.min || p.price >= price.max)) return false
      if (stockOnly && stockOf(p) === 0) return false
      return true
    })
    const by: Record<SortKey, (a: Product, b: Product) => number> = {
      featured: (a, b) => Number(!!b.featured) - Number(!!a.featured) || b.reviewCount - a.reviewCount,
      best: (a, b) => b.reviewCount - a.reviewCount,
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    }
    r = [...r].sort(by[sort])
    // Sold-out items sink to the end in every sort.
    return [...r.filter((p) => stockOf(p) > 0), ...r.filter((p) => stockOf(p) === 0)]
  }, [products, q, lists, price, stockOnly, sort])

  const sortLabel: Record<SortKey, string> = {
    featured: tx('المختار', 'Featured'),
    best: tx('الأكثر مبيعًا', 'Bestselling'),
    'price-asc': tx('السعر: من الأقل', 'Price: low to high'),
    'price-desc': tx('السعر: من الأعلى', 'Price: high to low'),
    new: tx('الأحدث', 'Newest'),
    rating: tx('الأعلى تقييمًا', 'Top rated'),
  }
  const priceLabel = (id: string) =>
    ({
      u500: tx(`أقل من ${money(500)}`, `Under ${money(500)}`),
      '500-1000': tx(`${money(500)} إلى ${money(1000)}`, `${money(500)} to ${money(1000)}`),
      '1000-2000': tx(`${money(1000)} إلى ${money(2000)}`, `${money(1000)} to ${money(2000)}`),
      '2000': tx(`${money(2000)} وأكتر`, `${money(2000)} and up`),
    })[id] ?? id

  const optLabel = (k: ListKey, v: string) => {
    if (k === 'cat') return pick(CATEGORY_LABEL[v as Category])
    if (k === 'skin') return tx(`بشرة ${SKIN_LABEL[v as SkinType]?.ar}`, `${SKIN_LABEL[v as SkinType]?.en} skin`)
    if (k === 'concern') return pick(CONCERN_LABEL[v as Concern])
    if (k === 'origin') return pick(originName(v as Origin))
    if (k === 'step') return tx(`الخطوة ${num(Number(v))}: ${STEP_LABEL[Number(v)]?.ar}`, `Step ${num(Number(v))}: ${STEP_LABEL[Number(v)]?.en}`)
    return v
  }

  // Title for the page
  const isImported = lists.origin.length > 0 && lists.origin.every((o) => o !== 'KR') && IMPORTED_ORIGINS.every((o) => lists.origin.includes(o))
  let title = tx('كل المنتجات', 'All products')
  if (q) title = tx(`نتايج البحث عن «${q}»`, `Results for “${q}”`)
  else if (brandName && lists.brand.length === 1) title = brandName
  else if (lists.cat.length === 1) title = pick(CATEGORY_LABEL[lists.cat[0] as Category])
  else if (lists.origin.length === 1 && lists.origin[0] === 'KR') title = tx('العناية الكورية', 'Korean skincare')
  else if (isImported) title = tx('العناية المستوردة', 'Imported skincare')
  else if (lists.skin.length === 1) title = tx(`لبشرة ${SKIN_LABEL[lists.skin[0] as SkinType]?.ar}`, `For ${SKIN_LABEL[lists.skin[0] as SkinType]?.en.toLowerCase()} skin`)
  else if (lists.concern.length === 1) title = pick(CONCERN_LABEL[lists.concern[0] as Concern])
  else if (lists.step.length === 1) title = tx(`الخطوة ${num(Number(lists.step[0]))}: ${STEP_LABEL[Number(lists.step[0])]?.ar}`, `Step ${num(Number(lists.step[0]))}: ${STEP_LABEL[Number(lists.step[0])]?.en}`)
  useTitle(title)

  const chips: { key: string; label: string; remove: () => void }[] = [
    ...LIST_KEYS.flatMap((k) => lists[k].map((v) => ({ key: `${k}:${v}`, label: optLabel(k, v), remove: () => toggle(k, v) }))),
    ...(price ? [{ key: 'price', label: priceLabel(price.id), remove: () => commit({}, { price: null }) }] : []),
    ...(stockOnly ? [{ key: 'stock', label: tx('المتوفر بس', 'In stock only'), remove: () => commit({}, { stock: null }) }] : []),
  ]

  const count = (pred: (p: Product) => boolean) => products.filter(pred).length

  const rail = (prefix: string) => (
    <div className="sf-rail">
      <FilterGroup legend={tx('القسم', 'Category')}>
        {CATEGORIES.map((c) => (
          <Check key={c} checked={lists.cat.includes(c)} onChange={() => toggle('cat', c)} label={pick(CATEGORY_LABEL[c])} n={num(count((p) => p.category === c))} />
        ))}
      </FilterGroup>
      <FilterGroup legend={tx('نوع البشرة', 'Skin type')}>
        {SKINS.map((s) => (
          <Check key={s} checked={lists.skin.includes(s)} onChange={() => toggle('skin', s)} label={pick(SKIN_LABEL[s])} n={num(count((p) => p.skinTypes.includes(s)))} />
        ))}
      </FilterGroup>
      <FilterGroup legend={tx('المشكلة', 'Concern')}>
        {CONCERNS.map((c) => (
          <Check key={c} checked={lists.concern.includes(c)} onChange={() => toggle('concern', c)} label={pick(CONCERN_LABEL[c])} n={num(count((p) => p.concerns.includes(c)))} />
        ))}
      </FilterGroup>
      <FilterGroup legend={tx('بلد المنشأ', 'Origin')}>
        {ALL_ORIGINS.map((o) => (
          <Check key={o} checked={lists.origin.includes(o)} onChange={() => toggle('origin', o)} label={pick(originName(o))} n={num(count((p) => p.origin === o))} />
        ))}
      </FilterGroup>
      <FilterGroup legend={tx('خطوة الروتين', 'Routine step')}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <Check key={s} checked={lists.step.includes(String(s))} onChange={() => toggle('step', String(s))} label={`${num(s)}. ${pick(STEP_LABEL[s])}`} />
        ))}
      </FilterGroup>
      <FilterGroup legend={tx('السعر', 'Price')}>
        {PRICES.map((p) => (
          <label key={p.id} className="sf-pick">
            <input type="radio" name={`${prefix}-price`} checked={price?.id === p.id} onChange={() => commit({}, { price: p.id })} />
            <span>{priceLabel(p.id)}</span>
          </label>
        ))}
        {price && (
          <button type="button" className="sf-textbtn sf-small" onClick={() => commit({}, { price: null })}>
            {tx('أي سعر', 'Any price')}
          </button>
        )}
      </FilterGroup>
      <FilterGroup legend={tx('التوفر', 'Availability')}>
        <Check checked={stockOnly} onChange={() => commit({}, { stock: stockOnly ? null : '1' })} label={tx('المتوفر بس', 'In stock only')} />
      </FilterGroup>
      <FilterGroup legend={tx('الماركة', 'Brand')} scroll>
        {brands.map(([b, n]) => (
          <Check key={b} checked={lists.brand.includes(b)} onChange={() => toggle('brand', b)} label={b} n={num(n)} latin />
        ))}
      </FilterGroup>
    </div>
  )

  return (
    <div className="sf-shop">
      <div className="sf-wrap">
        <nav className="sf-crumbs" aria-label={tx('مسار الصفحة', 'Breadcrumb')}>
          <Link to="/">{tx('الرئيسية', 'Home')}</Link>
          <span aria-hidden="true">/</span>
          {title !== tx('كل المنتجات', 'All products') ? <Link to="/shop">{tx('المتجر', 'Shop')}</Link> : <span aria-current="page">{tx('المتجر', 'Shop')}</span>}
        </nav>
        <header className="sf-pagehead">
          <h1 className="sf-display">{title}</h1>
        </header>

        <div className="sf-filterbar">
          <ul className="sf-quickcats" aria-label={tx('الأقسام', 'Categories')}>
            <li>
              <button type="button" className="sf-pill" aria-pressed={lists.cat.length === 0} onClick={() => commit({ cat: [] })}>
                {tx('الكل', 'All')}
              </button>
            </li>
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button type="button" className="sf-pill" aria-pressed={lists.cat.includes(c)} onClick={() => toggle('cat', c)}>
                  {pick(CATEGORY_LABEL[c])}
                </button>
              </li>
            ))}
          </ul>
          <div className="sf-filterbar__end">
            <p className="sf-count" role="status" aria-live="polite">
              {tx(`${num(results.length)} منتج`, `${num(results.length)} ${results.length === 1 ? 'item' : 'items'}`)}
            </p>
            <button type="button" className="sf-pill sf-pill--tool" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
              <SlidersHorizontal size={15} aria-hidden="true" />
              {chips.length ? tx(`الفلاتر (${num(chips.length)})`, `Filters (${num(chips.length)})`) : tx('الفلاتر', 'Filters')}
            </button>
            <label className="sf-sort">
              <span className="sr-only">{tx('رتّبي حسب', 'Sort by')}</span>
              <select value={sort} onChange={(e) => commit({}, { sort: e.target.value === 'featured' ? null : e.target.value })}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {sortLabel[s]}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
        </div>
        {chips.length > 0 && (
          <ul className="sf-activechips" aria-label={tx('الفلاتر المختارة', 'Active filters')}>
            {chips.map((c) => (
              <li key={c.key}>
                <button type="button" className="sf-chip sf-chip--on" onClick={c.remove} aria-label={tx(`شيلي فلتر ${c.label}`, `Remove filter ${c.label}`)}>
                  {c.label}
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <button type="button" className="sf-textbtn sf-small" onClick={clearAll}>
                {tx('امسحي كل الفلاتر', 'Clear all filters')}
              </button>
            </li>
          </ul>
        )}
      </div>

      <div className="sf-shop__grid">
        {results.length ? (
          <ProductPanes products={results} label={title} />
        ) : (
          <div className="sf-wrap">
            <div className="sf-empty">
              <Sticker size={88}>
                {num(0)}
              </Sticker>
              <p className="sf-empty__title">{q ? tx(`مفيش نتايج لـ «${q}»`, `Nothing matches “${q}”`) : tx('مفيش منتجات بالفلاتر دي', 'No products match these filters')}</p>
              <p className="sf-muted">
                {q && !chips.length
                  ? tx('جرّبي كلمة أقصر، أو اسم الماركة، أو نوع المنتج زي «سيروم» أو «واقي شمس».', 'Try a shorter word, a brand name, or a product type like “serum” or “sunscreen”.')
                  : tx('شيلي فلتر من الفلاتر دي عشان تظهر منتجات أكتر:', 'Remove one of these filters to see more products:')}
              </p>
              {chips.length > 0 && (
                <ul className="sf-activechips">
                  {chips.map((c) => (
                    <li key={c.key}>
                      <button type="button" className="sf-chip sf-chip--on" onClick={c.remove}>
                        {tx(`شيلي ${c.label}`, `Remove ${c.label}`)}
                        <X size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="sf-row">
                <button type="button" className="sf-btn sf-btn--lemon" onClick={() => navigate('/shop')}>
                  {tx('اعرضي كل المنتجات', 'Show everything')}
                  <Arrow />
                </button>
                <Link to="/routine" className="sf-textbtn">
                  {tx('أو خلّينا نختارلك روتين', 'Or let us pick a routine')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Door
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        side="start"
        title={tx('الفلاتر', 'Filters')}
        footer={
          <div className="sf-row sf-row--between">
            <button type="button" className="sf-textbtn" onClick={clearAll}>
              {tx('امسحي الكل', 'Clear all')}
            </button>
            <button type="button" className="sf-btn sf-btn--quiet" onClick={() => setFiltersOpen(false)}>
              {tx(`اعرضي ${num(results.length)} منتج`, `Show ${num(results.length)} products`)}
            </button>
          </div>
        }
      >
        {rail('door')}
      </Door>
    </div>
  )
}

function FilterGroup({ legend, children, scroll }: { legend: string; children: ReactNode; scroll?: boolean }) {
  return (
    <fieldset className="sf-fgroup">
      <legend className="sf-fgroup__legend">{legend}</legend>
      <div className={`sf-fgroup__opts${scroll ? ' sf-fgroup__opts--scroll' : ''}`}>{children}</div>
    </fieldset>
  )
}

function Check({ checked, onChange, label, n, latin }: { checked: boolean; onChange: () => void; label: string; n?: string; latin?: boolean }) {
  return (
    <label className="sf-pick">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span lang={latin ? 'en' : undefined}>{latin ? <bdi>{label}</bdi> : label}</span>
      {n && <span className="sf-pick__n">{n}</span>}
    </label>
  )
}
