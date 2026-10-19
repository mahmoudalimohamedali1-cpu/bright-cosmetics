import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, Download, Eye, EyeOff, Plus, Search, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { Badge, Empty, PageHeader, Pane, Tabs, Thumb, useAdmin } from '../ui'
import { daysOfCover, productSales, stock } from '../../lib/metrics'
import { DAY } from '../../lib/rand'
import { originName } from '../../data/catalog'
import type { Category, Origin, ProductStatus } from '../../data/types'
import { Pager } from '../parts/core/ui'
import { downloadCSV, stockState, today } from '../parts/core/lib'
import type { StockState } from '../parts/core/lib'
import { useCategories } from '../../lib/useCategories'

type Tab = 'all' | ProductStatus
type Sort = 'name' | 'stock' | 'cover' | 'units' | 'profit' | 'margin' | 'price'
const PAGE = 50

export default function Products() {
  const { tx, pick, money, num, pct } = useI18n()
  const { label: catLabel, all: allCats } = useCategories()
  const { toast, staff, can } = useAdmin()
  const canEdit = can('products.edit')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const products = useStore((s) => s.products)
  const orders = useStore((s) => s.orders)
  const setProductStatus = useStore((s) => s.setProductStatus)
  const log = useStore((s) => s.log)

  const [tab, setTab] = useState<Tab>((params.get('status') as Tab) ?? 'all')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [cat, setCat] = useState<Category | ''>((params.get('category') as Category) ?? '')
  const [brand, setBrand] = useState(params.get('brand') ?? '')
  const [origin, setOrigin] = useState<Origin | ''>('')
  const [stockF, setStockF] = useState<StockState | ''>((params.get('stock') as StockState) ?? '')
  const [sort, setSort] = useState<Sort>((params.get('sort') as Sort) ?? 'name')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const s30 = useMemo(() => productSales(orders, Date.now() - 30 * DAY), [orders])
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products])
  const origins = useMemo(() => [...new Set(products.map((p) => p.origin))], [products])

  const rows = useMemo(
    () =>
      products.map((p) => {
        const onHand = stock(p)
        const sale = s30.get(p.id)
        return {
          p,
          onHand,
          state: stockState(p, onHand),
          cover: daysOfCover(p, s30),
          units: sale?.units ?? 0,
          profit: sale?.profit ?? 0,
          margin: p.price ? (p.price - p.cost) / p.price : 0,
        }
      }),
    [products, s30],
  )

  const counts = useMemo(() => {
    const c = { all: products.length, active: 0, draft: 0, archived: 0 }
    products.forEach((p) => c[p.status]++)
    return c
  }, [products])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const out = rows.filter(({ p, state }) => {
      if (tab !== 'all' && p.status !== tab) return false
      if (cat && p.category !== cat) return false
      if (brand && p.brand !== brand) return false
      if (origin && p.origin !== origin) return false
      if (stockF && state !== stockF) return false
      if (s && !`${p.name.ar} ${p.name.en} ${p.brand} ${p.sku} ${p.barcode}`.toLowerCase().includes(s)) return false
      return true
    })
    const by: Record<Sort, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      name: (a, b) => a.p.brand.localeCompare(b.p.brand) || a.p.name.en.localeCompare(b.p.name.en),
      stock: (a, b) => a.onHand - b.onHand,
      cover: (a, b) => a.cover - b.cover,
      units: (a, b) => b.units - a.units,
      profit: (a, b) => b.profit - a.profit,
      margin: (a, b) => b.margin - a.margin,
      price: (a, b) => b.p.price - a.p.price,
    }
    return out.sort(by[sort])
  }, [rows, tab, cat, brand, origin, stockF, q, sort])

  useEffect(() => setPage(0), [tab, cat, brand, origin, stockF, q, sort])

  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const filtersOn = !!(q || cat || brand || origin || stockF)
  const clear = () => {
    setQ('')
    setCat('')
    setBrand('')
    setOrigin('')
    setStockF('')
  }
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const allOn = pageRows.length > 0 && pageRows.every((r) => sel.has(r.p.id))
  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s)
      pageRows.forEach((r) => (allOn ? n.delete(r.p.id) : n.add(r.p.id)))
      return n
    })

  const setStatus = (st: ProductStatus) => {
    const ids = [...sel]
    setProductStatus(ids, st)
    const label = { active: ['نشط', 'active'], draft: ['مسودة', 'draft'], archived: ['مؤرشف', 'archived'] }[st]
    log(staff, { ar: `غيّر حالة ${ids.length} منتج إلى ${label[0]}`, en: `Set ${ids.length} products to ${label[1]}` }, '/admin/products')
    toast(tx(`اتغيرت حالة ${num(ids.length)} منتج`, `${ids.length} products set to ${label[1]}`))
    setSel(new Set())
  }

  const exportCSV = (list: typeof rows) => {
    downloadCSV(`nuri-products-${today()}.csv`, [
      ['SKU', 'Barcode', 'Brand', 'Name (EN)', 'Name (AR)', 'Category', 'Origin', 'Status', 'Price', 'Compare at', 'Landed cost', 'Margin %', 'On hand', 'Low stock at', 'Units 30d', 'Days of cover'],
      ...list.map(({ p, onHand, units, cover, margin }) => [
        p.sku,
        p.barcode,
        p.brand,
        p.name.en,
        p.name.ar,
        p.category,
        p.origin,
        p.status,
        p.price,
        p.compareAt,
        p.cost,
        Math.round(margin * 1000) / 10,
        onHand,
        p.lowStockAt,
        units,
        isFinite(cover) ? Math.round(cover) : '',
      ]),
    ])
    toast(tx(`اتصدّر ${num(list.length)} منتج`, `Exported ${list.length} products`))
  }

  const statusBadge = (s: ProductStatus) =>
    s === 'active' ? <Badge tone="ok">{tx('نشط', 'Active')}</Badge> : s === 'draft' ? <Badge tone="info">{tx('مسودة', 'Draft')}</Badge> : <Badge>{tx('مؤرشف', 'Archived')}</Badge>

  return (
    <>
      <PageHeader
        title={tx('المنتجات', 'Products')}
        description={tx('الهامش محسوب على تكلفة الاستيراد الفعلية (شراء وشحن وجمارك)', 'Margins use real landed cost: purchase, freight and customs')}
        actions={
          <>
            <button className="btn" onClick={() => exportCSV(filtered)} disabled={!filtered.length}>
              <Download size={16} aria-hidden />
              {tx('تصدير CSV', 'Export CSV')}
            </button>
            {canEdit && (
              <Link className="btn btn--primary" to="/admin/products/new">
                <Plus size={16} aria-hidden />
                {tx('إضافة منتج', 'Add product')}
              </Link>
            )}
          </>
        }
      />
      <Pane flush>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: tx('الكل', 'All'), count: counts.all },
            { value: 'active', label: tx('نشط', 'Active'), count: counts.active },
            { value: 'draft', label: tx('مسودة', 'Draft'), count: counts.draft },
            { value: 'archived', label: tx('مؤرشف', 'Archived'), count: counts.archived },
          ]}
        />
        <div className="toolbar">
          <div className="input-group" style={{ flex: '1 1 240px', maxWidth: 340 }}>
            <span className="addon">
              <Search size={14} aria-hidden />
            </span>
            <input
              className="input core-input-sm"
              style={{ maxWidth: 'none' }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tx('اسم المنتج أو البراند أو SKU', 'Name, brand or SKU')}
              aria-label={tx('بحث في المنتجات', 'Search products')}
            />
          </div>
          <select className="select core-select-sm" value={cat} onChange={(e) => setCat(e.target.value as Category | '')} aria-label={tx('الفئة', 'Category')}>
            <option value="">{tx('كل الفئات', 'All categories')}</option>
            {allCats.map((x) => x.id).map((c) => (
              <option key={c} value={c}>
                {pick(catLabel(c))}
              </option>
            ))}
          </select>
          <select className="select core-select-sm" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label={tx('البراند', 'Brand')}>
            <option value="">{tx('كل البراندات', 'All brands')}</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select className="select core-select-sm" value={origin} onChange={(e) => setOrigin(e.target.value as Origin | '')} aria-label={tx('بلد المنشأ', 'Origin')}>
            <option value="">{tx('كل البلاد', 'All origins')}</option>
            {origins.map((o) => (
              <option key={o} value={o}>
                {pick(originName(o))}
              </option>
            ))}
          </select>
          <select className="select core-select-sm" value={stockF} onChange={(e) => setStockF(e.target.value as StockState | '')} aria-label={tx('حالة المخزون', 'Stock')}>
            <option value="">{tx('أي مخزون', 'Any stock')}</option>
            <option value="ok">{tx('متوفر', 'In stock')}</option>
            <option value="low">{tx('قليل', 'Low')}</option>
            <option value="out">{tx('نفد', 'Out of stock')}</option>
          </select>
          <select className="select core-select-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={tx('الترتيب', 'Sort')} style={{ marginInlineStart: 'auto' }}>
            <option value="name">{tx('البراند والاسم', 'Brand and name')}</option>
            <option value="units">{tx('الأكثر مبيعًا', 'Best selling')}</option>
            <option value="profit">{tx('الأعلى ربحًا', 'Most profit')}</option>
            <option value="margin">{tx('الأعلى هامشًا', 'Highest margin')}</option>
            <option value="cover">{tx('الأقل أيام تغطية', 'Fewest days of cover')}</option>
            <option value="stock">{tx('الأقل مخزونًا', 'Lowest stock')}</option>
            <option value="price">{tx('الأعلى سعرًا', 'Highest price')}</option>
          </select>
          {filtersOn && (
            <button className="btn btn--ghost btn--sm" onClick={clear}>
              <X size={14} aria-hidden />
              {tx('مسح الفلاتر', 'Clear filters')}
            </button>
          )}
        </div>

        {sel.size > 0 && (
          <div className="bulkbar" style={{ margin: 12 }}>
            <strong className="num">{tx(`${num(sel.size)} محدد`, `${sel.size} selected`)}</strong>
            <span style={{ flex: 1 }} />
            {canEdit && (
              <>
                <button className="btn btn--sm" onClick={() => setStatus('active')}>
                  <Eye size={14} aria-hidden />
                  {tx('تفعيل', 'Set active')}
                </button>
                <button className="btn btn--sm" onClick={() => setStatus('draft')}>
                  <EyeOff size={14} aria-hidden />
                  {tx('تحويل لمسودة', 'Set as draft')}
                </button>
                <button className="btn btn--sm" onClick={() => setStatus('archived')}>
                  <Archive size={14} aria-hidden />
                  {tx('أرشفة', 'Archive')}
                </button>
              </>
            )}
            <button className="btn btn--sm" onClick={() => exportCSV(rows.filter((r) => sel.has(r.p.id)))}>
              <Download size={14} aria-hidden />
              CSV
            </button>
            <button className="btn btn--sm btn--icon" onClick={() => setSel(new Set())} aria-label={tx('إلغاء التحديد', 'Clear selection')}>
              <X size={14} />
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          filtersOn ? (
            <Empty
              title={tx('مفيش منتجات بالفلاتر دي', 'No products match these filters')}
              action={
                <button className="btn" onClick={clear}>
                  {tx('مسح الفلاتر', 'Clear filters')}
                </button>
              }
            >
              {tx('البحث باسم البراند بالإنجليزي أو مسح فلتر المخزون ممكن يساعد.', 'Try the brand name in English, or clear the stock filter.')}
            </Empty>
          ) : (
            <Empty
              title={tx('مفيش منتجات هنا', 'No products here')}
              action={
                canEdit ? (
                  <Link className="btn btn--primary" to="/admin/products/new">
                    {tx('إضافة منتج', 'Add product')}
                  </Link>
                ) : undefined
              }
            />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="core-tight">
                      <input type="checkbox" className="check" checked={allOn} onChange={toggleAll} aria-label={tx('تحديد كل الصفحة', 'Select page')} />
                    </th>
                    <th>{tx('المنتج', 'Product')}</th>
                    <th>{tx('البراند', 'Brand')}</th>
                    <th>{tx('الحالة', 'Status')}</th>
                    <th className="t-end">{tx('المخزون', 'Stock')}</th>
                    <th className="t-end">{tx('أيام التغطية', 'Days of cover')}</th>
                    <th className="t-end">{tx('السعر', 'Price')}</th>
                    <th className="t-end">{tx('الهامش', 'Margin')}</th>
                    <th className="t-end">{tx('مبيعات 30 يوم', '30-day units')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ p, onHand, state, cover, units, margin }) => (
                    <tr key={p.id} className="row-link" data-selected={sel.has(p.id)} onClick={() => navigate(`/admin/products/${p.id}`)}>
                      <td className="core-tight" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="check" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={tx(`تحديد ${p.name.ar}`, `Select ${p.name.en}`)} />
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div className="core-name">
                          <Thumb product={p} />
                          <div>
                            <Link to={`/admin/products/${p.id}`} onClick={(e) => e.stopPropagation()} className="ellipsis" style={{ display: 'block', maxWidth: 320 }}>
                              {pick(p.name)}
                            </Link>
                            <span className="tiny faint num">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{p.brand}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td className="t-num">
                        <Link
                          to={`/admin/inventory?tab=stock&q=${encodeURIComponent(p.sku)}`}
                          onClick={(e) => e.stopPropagation()}
                          className={state !== 'ok' ? 'core-low' : undefined}
                          title={state === 'out' ? tx('نفد', 'Out of stock') : state === 'low' ? tx(`أقل من حد التنبيه (${p.lowStockAt})`, `At or below alert level (${p.lowStockAt})`) : undefined}
                        >
                          {num(onHand)}
                        </Link>
                      </td>
                      <td className="t-num">{isFinite(cover) ? <span className={cover < 21 ? 'core-low' : undefined}>{num(Math.round(cover))}</span> : <span className="faint">—</span>}</td>
                      <td className="t-num">
                        {money(p.price)}
                        {p.priceConfirmed === false && (
                          <>
                            <br />
                            <span className="badge badge--warn" title={tx('سعر تقديري، محتاج تأكيد', 'Estimated price, needs confirming')}>{tx('سعر تقديري', 'Estimated')}</span>
                          </>
                        )}
                        {p.compareAt && <div className="tiny faint" style={{ textDecoration: 'line-through' }}>{money(p.compareAt)}</div>}
                      </td>
                      <td className="t-num">{pct(margin, 0)}</td>
                      <td className="t-num">{num(units)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageSize={PAGE} total={filtered.length} onPage={setPage} />
          </>
        )}
      </Pane>
    </>
  )
}
