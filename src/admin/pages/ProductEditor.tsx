import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Minus, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { Bi } from '../../i18n'
import { useStore } from '../../store'
import { Drawer, Empty, Field, PageHeader, Pane, Seg, useAdmin } from '../ui'
import { ProductVisual } from '../../components/ProductVisual'
import { CATEGORY_LABEL, CONCERN_LABEL, SKIN_LABEL, STEP_LABEL, originName } from '../../data/catalog'
import type { Batch, Category, Concern, Origin, Product, ProductStatus, Shape, SkinType } from '../../data/types'
import { daysUntil } from '../../lib/metrics'
import { uid } from '../../lib/rand'
import { Chip } from '../parts/core/ui'
import { today } from '../parts/core/lib'

const SHAPES: Shape[] = ['dropper', 'pump', 'jar', 'tube', 'toner', 'mask', 'cushion', 'tint', 'pad']
const SHAPE_LABEL: Record<Shape, Bi> = {
  dropper: { ar: 'زجاجة بقطّارة', en: 'Dropper bottle' },
  pump: { ar: 'زجاجة ببمب', en: 'Pump bottle' },
  jar: { ar: 'برطمان', en: 'Jar' },
  tube: { ar: 'أنبوبة', en: 'Tube' },
  toner: { ar: 'زجاجة تونر', en: 'Toner bottle' },
  mask: { ar: 'ماسك شيت', en: 'Sheet mask' },
  cushion: { ar: 'كوشن', en: 'Cushion compact' },
  tint: { ar: 'تينت', en: 'Tint' },
  pad: { ar: 'علبة باد', en: 'Pad jar' },
}
const ORIGINS: Origin[] = ['KR', 'JP', 'FR', 'US', 'CA', 'DE']
const SKINS: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']
const CONCERNS: Concern[] = ['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness', 'sun', 'barrier']

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')

function blank(lowStock: number): Product {
  return {
    id: uid('p'),
    slug: '',
    sku: '',
    barcode: '',
    brand: '',
    origin: 'KR',
    name: { ar: '', en: '' },
    short: { ar: '', en: '' },
    description: { ar: '', en: '' },
    howToUse: { ar: '', en: '' },
    category: 'serum',
    routineStep: 3,
    routineTime: ['am', 'pm'],
    skinTypes: [],
    concerns: [],
    ingredients: [{ ar: '', en: '' }],
    size: '',
    price: 0,
    cost: 0,
    batches: [],
    lowStockAt: lowStock,
    visual: { shape: 'dropper', body: '#e6efe2', cap: '#2b2b2b', label: '#ffffff', text: '#222222' },
    rating: 0,
    reviewCount: 0,
    tags: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
  }
}

const strip = (p: Product) => JSON.stringify({ ...p, batches: undefined })

type Errors = Partial<Record<string, string>>

export default function ProductEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { tx, pick, money, num, pct, date, lang } = useI18n()
  const { toast, staff } = useAdmin()
  const navigate = useNavigate()
  const products = useStore((s) => s.products)
  const shipments = useStore((s) => s.shipments)
  const settings = useStore((s) => s.settings)
  const { upsertProduct, deleteProduct, addBatch, adjustBatch, setProductStatus, log } = useStore.getState()

  const stored = isNew ? undefined : products.find((p) => p.id === id)
  const [base, setBase] = useState<Product | undefined>(() => (isNew ? blank(settings.lowStockDefault) : stored))
  const [draft, setDraft] = useState<Product | undefined>(base)
  const [errors, setErrors] = useState<Errors>({})
  const [pendingNav, setPendingNav] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nb, setNb] = useState({ lot: '', qty: '', expiry: '', shipmentId: '' })
  const [nbErr, setNbErr] = useState<Errors>({})
  const bypass = useRef(false)

  // Reset when navigating between products
  useEffect(() => {
    const b = isNew ? blank(settings.lowStockDefault) : useStore.getState().products.find((p) => p.id === id)
    setBase(b)
    setDraft(b)
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dirty = !!draft && !!base && strip(draft) !== strip(base)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  // Unsaved-changes guard: browser close/reload, and in-app links (captured before the router sees them).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault()
    }
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || bypass.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname === location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      setPendingNav(url.pathname + url.search)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  const usedBy = useMemo(() => {
    if (!draft) return undefined
    const sku = draft.sku.trim().toLowerCase()
    return sku ? products.find((p) => p.id !== draft.id && p.sku.toLowerCase() === sku) : undefined
  }, [products, draft])

  if (!draft) {
    return (
      <>
        <PageHeader title={tx('المنتج مش موجود', 'Product not found')} back={{ to: '/admin/products', label: tx('المنتجات', 'Products') }} />
        <Pane>
          <Empty
            title={tx('مفيش منتج بالرابط ده', 'There is no product at this link')}
            action={
              <Link className="btn" to="/admin/products">
                {tx('الرجوع للمنتجات', 'Back to products')}
              </Link>
            }
          >
            {tx('ممكن يكون اتحذف. البحث بالاسم أو SKU متاح في قائمة المنتجات.', 'It may have been deleted. Search by name or SKU from the products list.')}
          </Empty>
        </Pane>
      </>
    )
  }

  const d = draft
  const set = <K extends keyof Product>(k: K, v: Product[K]) => {
    setDraft((p) => (p ? { ...p, [k]: v } : p))
    if (errors[k as string]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const setBi = (k: 'name' | 'short' | 'description' | 'howToUse', l: 'ar' | 'en', v: string) => {
    setDraft((p) => (p ? { ...p, [k]: { ...p[k], [l]: v } } : p))
    if (errors[`${k}.${l}`]) setErrors((e) => ({ ...e, [`${k}.${l}`]: undefined }))
  }
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const batches = isNew ? d.batches : (stored?.batches ?? d.batches)
  const onHand = batches.reduce((a, b) => a + b.qty, 0)
  const profitUnit = d.price - d.cost
  const margin = d.price ? profitUnit / d.price : 0
  const slug = d.slug || slugify(`${d.brand} ${d.name.en}`)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!d.name.ar.trim()) e['name.ar'] = tx('اسم المنتج بالعربي مطلوب، وهو اللي بيظهر في المتجر بالعربي.', 'Add the Arabic name. It is what Arabic shoppers see.')
    if (!d.name.en.trim()) e['name.en'] = tx('اسم المنتج بالإنجليزي مطلوب، زي ما هو مكتوب على العبوة.', 'Add the English name, as printed on the pack.')
    if (!d.brand.trim()) e.brand = tx('اختيار البراند مطلوب، أو كتابة اسم براند جديد.', 'Pick a brand or type a new one.')
    if (!(d.price > 0)) e.price = tx('السعر لازم يكون أكبر من صفر.', 'Enter a price above 0.')
    if (d.cost < 0) e.cost = tx('التكلفة مينفعش تكون بالسالب.', 'Landed cost cannot be negative.')
    if (d.compareAt !== undefined && d.compareAt > 0 && d.compareAt <= d.price)
      e.compareAt = tx('السعر قبل الخصم لازم يكون أعلى من السعر الحالي، أو يفضل فاضي.', 'Compare-at must be higher than the price, or leave it empty.')
    if (!d.sku.trim()) e.sku = tx('SKU مطلوب عشان المخزون والتصدير، مثلًا NR-COS-030.', 'SKU is needed for stock and exports, for example NR-COS-030.')
    else if (usedBy) e.sku = tx(`الـSKU ده مستخدم في "${usedBy.name.ar}". المطلوب كود مختلف.`, `This SKU is already used by “${usedBy.name.en}”. Use a different one.`)
    if (d.lowStockAt < 0) e.lowStockAt = tx('حد التنبيه لازم يكون صفر أو أكتر.', 'The alert level must be 0 or more.')
    if (!d.skinTypes.length) e.skinTypes = tx('اختيار نوع بشرة واحد على الأقل، عشان أداة الروتين تقدر ترشّحه.', 'Pick at least one skin type so the routine finder can recommend it.')
    if (d.status === 'active' && !d.short.ar.trim() && !d.short.en.trim())
      e['short.ar'] = tx('المنتج النشط محتاج وصف مختصر يظهر في الكارت.', 'Active products need a short description for the product card.')
    return e
  }

  const save = () => {
    const e = validate()
    setErrors(e)
    const n = Object.values(e).filter(Boolean).length
    if (n) {
      toast(tx(`فيه ${num(n)} حقل محتاج تصحيح`, `${n} field${n > 1 ? 's' : ''} need fixing`))
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const clean: Product = {
      ...d,
      slug,
      name: { ar: d.name.ar.trim(), en: d.name.en.trim() },
      brand: d.brand.trim(),
      sku: d.sku.trim(),
      compareAt: d.compareAt && d.compareAt > 0 ? d.compareAt : undefined,
      ingredients: d.ingredients.filter((i) => i.ar.trim() || i.en.trim()),
      batches: isNew ? d.batches : (useStore.getState().products.find((p) => p.id === d.id)?.batches ?? d.batches),
    }
    upsertProduct(clean)
    log(staff, { ar: `${isNew ? 'أضاف' : 'عدّل'} ${clean.name.ar}`, en: `${isNew ? 'Added' : 'Updated'} ${clean.name.en}` }, `/admin/products/${clean.id}`)
    toast(tx('اتحفظ المنتج', 'Product saved'))
    setBase(clean)
    setDraft(clean)
    if (isNew) {
      bypass.current = true
      navigate(`/admin/products/${clean.id}`, { replace: true })
      bypass.current = false
    }
  }

  const discard = () => {
    setDraft(base)
    setErrors({})
  }

  const doDelete = () => {
    bypass.current = true
    deleteProduct(d.id)
    log(staff, { ar: `حذف ${d.name.ar}`, en: `Deleted ${d.name.en}` })
    toast(tx('اتحذف المنتج', 'Product deleted'))
    navigate('/admin/products')
  }

  const addNewBatch = () => {
    const e: Errors = {}
    if (!nb.lot.trim()) e.lot = tx('رقم التشغيلة مطلوب، مكتوب على العبوة', 'Lot number is required, it is printed on the pack')
    if (!(Number(nb.qty) > 0)) e.qty = tx('الكمية لازم تكون أكبر من صفر', 'Quantity must be above 0')
    if (!nb.expiry) e.expiry = tx('تاريخ الصلاحية مطلوب', 'Expiry date is required')
    else if (nb.expiry <= today()) e.expiry = tx('التاريخ ده عدّى. تشغيلة منتهية مينفعش تتضاف للبيع', 'That date has passed. Expired lots cannot be added for sale')
    setNbErr(e)
    if (Object.keys(e).length) return
    const b: Batch = { id: uid(`${d.id}-b`), lot: nb.lot.trim(), qty: Number(nb.qty), expiry: nb.expiry, receivedAt: new Date().toISOString(), shipmentId: nb.shipmentId || 'manual' }
    if (isNew) set('batches', [...d.batches, b])
    else {
      addBatch(d.id, b)
      log(staff, { ar: `أضاف تشغيلة ${b.lot} (${b.qty}) لـ${d.name.ar}`, en: `Added lot ${b.lot} (${b.qty}) to ${d.name.en}` }, `/admin/products/${d.id}`)
      toast(tx('اتضافت التشغيلة', 'Lot added'))
    }
    setNb({ lot: '', qty: '', expiry: '', shipmentId: '' })
  }

  const bump = (b: Batch, delta: number) => {
    if (isNew) set('batches', d.batches.map((x) => (x.id === b.id ? { ...x, qty: Math.max(0, x.qty + delta) } : x)))
    else adjustBatch(d.id, b.id, delta, 'count correction')
  }

  const biRow = (k: 'name' | 'short' | 'description' | 'howToUse', label: Bi, multiline?: boolean) => (
    <>
      {(['ar', 'en'] as const).map((l) => {
        const idAttr = `f-${k}-${l}`
        const err = errors[`${k}.${l}`]
        const common = {
          id: idAttr,
          dir: l === 'ar' ? 'rtl' : 'ltr',
          lang: l,
          value: d[k][l],
          'aria-invalid': !!err,
        } as const
        return (
          <Field key={l} label={`${label[lang]} (${l === 'ar' ? tx('عربي', 'Arabic') : tx('إنجليزي', 'English')})`} htmlFor={idAttr} error={err}>
            {multiline ? (
              <textarea {...common} className="textarea" onChange={(e) => setBi(k, l, e.target.value)} />
            ) : (
              <input {...common} className="input" onChange={(e) => setBi(k, l, e.target.value)} />
            )}
          </Field>
        )
      })}
    </>
  )

  const numInput = (k: 'price' | 'compareAt' | 'cost' | 'lowStockAt', label: string, hint?: string, addon?: string) => (
    <Field label={label} htmlFor={`f-${k}`} error={errors[k]} hint={hint}>
      <div className="input-group">
        {addon && <span className="addon">{addon}</span>}
        <input
          id={`f-${k}`}
          className="input num"
          type="number"
          inputMode="decimal"
          min={0}
          value={d[k] === undefined || (k === 'compareAt' && !d[k]) ? '' : String(d[k])}
          aria-invalid={!!errors[k]}
          onChange={(e) => set(k, (e.target.value === '' ? (k === 'compareAt' ? undefined : 0) : Number(e.target.value)) as never)}
        />
      </div>
    </Field>
  )

  const statusLabel: Record<ProductStatus, string> = { active: tx('نشط', 'Active'), draft: tx('مسودة', 'Draft'), archived: tx('مؤرشف', 'Archived') }

  const card = (l: 'ar' | 'en') => (
    <div className="core-card" dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l}>
      <div className="core-card__img">
        <ProductVisual visual={d.visual} brand={d.brand || 'Brand'} size={d.size} />
      </div>
      <div className="core-card__body">
        <div className="core-card__brand">{d.brand || (l === 'ar' ? 'البراند' : 'Brand')}</div>
        <div className="core-card__name">{d.name[l] || (l === 'ar' ? 'اسم المنتج' : 'Product name')}</div>
        <div className="core-card__price">
          {l === 'ar' ? `${new Intl.NumberFormat('ar-EG-u-nu-latn').format(d.price)} ج.م` : `EGP ${new Intl.NumberFormat('en-GB').format(d.price)}`}
          {d.compareAt && d.compareAt > d.price ? <s>{l === 'ar' ? `${d.compareAt} ج.م` : `EGP ${d.compareAt}`}</s> : null}
        </div>
      </div>
    </div>
  )

  const serp = (l: 'ar' | 'en') => {
    const title = `${d.name[l] || (l === 'ar' ? 'اسم المنتج' : 'Product name')} | ${d.brand || 'Brand'} | ${settings.storeName[l]}`
    const desc = d.short[l] || d.description[l] || (l === 'ar' ? 'الوصف المختصر بيظهر هنا.' : 'The short description shows here.')
    return (
      <div className="core-serp" dir={l === 'ar' ? 'rtl' : 'ltr'} lang={l}>
        <div className="core-serp__url">nuri.example › p › {slug || '…'}</div>
        <div className="core-serp__title">{title.length > 62 ? `${title.slice(0, 60)}…` : title}</div>
        <div className="core-serp__desc">{desc.length > 158 ? `${desc.slice(0, 155)}…` : desc}</div>
      </div>
    )
  }

  const pane = (title: string, children: ReactNode, description?: string) => (
    <Pane title={title} description={description}>
      {children}
    </Pane>
  )

  return (
    <>
      <PageHeader
        back={{ to: '/admin/products', label: tx('المنتجات', 'Products') }}
        title={isNew ? tx('إضافة منتج', 'Add product') : pick(base?.name) || tx('منتج بدون اسم', 'Untitled product')}
        description={!isNew ? `${d.brand} ${d.sku}` : tx('الحقول بالعربي والإنجليزي جنب بعض', 'Arabic and English fields side by side')}
        actions={
          <>
            {!isNew && d.status === 'active' && (
              <a className="btn btn--ghost" href={`/p/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} aria-hidden />
                {tx('عرض في المتجر', 'View in store')}
              </a>
            )}
            {!isNew && (
              <button className="btn btn--danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} aria-hidden />
                {tx('حذف', 'Delete')}
              </button>
            )}
            <button className="btn btn--primary" onClick={save} disabled={!dirty && !isNew}>
              {tx('حفظ', 'Save')}
            </button>
          </>
        }
      />

      {dirty && (
        <div className="core-sticky-save" role="region" aria-label={tx('تغييرات غير محفوظة', 'Unsaved changes')}>
          <span className="small">{tx('فيه تغييرات لسه ما اتحفظتش', 'You have unsaved changes')}</span>
          <div className="row">
            <button className="btn btn--sm" style={{ ['--btn-bg' as string]: 'transparent', ['--btn-fg' as string]: '#fff', ['--btn-line' as string]: 'rgb(255 255 255 / 0.3)' }} onClick={discard}>
              {tx('تجاهل', 'Discard')}
            </button>
            <button className="btn btn--live btn--sm" onClick={save}>
              {tx('حفظ', 'Save')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-main">
        <div className="stack">
          {pane(
            tx('الاسم والوصف', 'Name and description'),
            <div className="core-bi">
              {biRow('name', { ar: 'الاسم', en: 'Name' })}
              {biRow('short', { ar: 'وصف مختصر', en: 'Short description' }, true)}
              {biRow('description', { ar: 'الوصف الكامل', en: 'Full description' }, true)}
              {biRow('howToUse', { ar: 'طريقة الاستخدام', en: 'How to use' }, true)}
            </div>,
          )}

          {pane(
            tx('المكونات', 'Ingredients'),
            <div className="stack" style={{ gap: 8 }}>
              <div className="core-ing">
                <span className="core-bi__head">{tx('بالعربي', 'Arabic')}</span>
                <span className="core-bi__head">{tx('بالإنجليزي (INCI)', 'English (INCI)')}</span>
                <span />
              </div>
              {d.ingredients.map((ing, i) => (
                <div className="core-ing" key={i}>
                  <input
                    className="input"
                    dir="rtl"
                    lang="ar"
                    value={ing.ar}
                    aria-label={tx(`المكوّن ${i + 1} بالعربي`, `Ingredient ${i + 1} in Arabic`)}
                    onChange={(e) => set('ingredients', d.ingredients.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)))}
                  />
                  <input
                    className="input"
                    dir="ltr"
                    lang="en"
                    value={ing.en}
                    aria-label={tx(`المكوّن ${i + 1} بالإنجليزي`, `Ingredient ${i + 1} in English`)}
                    onChange={(e) => set('ingredients', d.ingredients.map((x, j) => (j === i ? { ...x, en: e.target.value } : x)))}
                  />
                  <button className="btn btn--ghost btn--icon" onClick={() => set('ingredients', d.ingredients.filter((_, j) => j !== i))} aria-label={tx('حذف المكوّن', 'Remove ingredient')}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div>
                <button className="btn btn--sm" onClick={() => set('ingredients', [...d.ingredients, { ar: '', en: '' }])}>
                  <Plus size={14} aria-hidden />
                  {tx('إضافة مكوّن', 'Add ingredient')}
                </button>
              </div>
            </div>,
            tx('المكونات الأساسية بالترتيب اللي على العبوة', 'Key ingredients, in the order printed on the pack'),
          )}

          {pane(
            tx('السعر والربح', 'Pricing and profit'),
            <div className="stack">
              <div className="grid grid-3">
                {numInput('price', tx('السعر', 'Price'), undefined, tx('ج.م', 'EGP'))}
                {numInput('compareAt', tx('السعر قبل الخصم', 'Compare-at price'), tx('اختياري، بيظهر مشطوب', 'Optional, shown struck through'), tx('ج.م', 'EGP'))}
                {numInput('cost', tx('تكلفة الاستيراد للوحدة', 'Landed cost per unit'), tx('شراء + شحن + جمارك', 'Purchase + freight + customs'), tx('ج.م', 'EGP'))}
              </div>
              <div className="core-calc">
                <div>
                  <span className="tiny muted">{tx('الربح في الوحدة', 'Profit per unit')}</span>
                  <strong style={{ color: profitUnit < 0 ? 'var(--bad)' : undefined }}>{money(profitUnit)}</strong>
                </div>
                <div>
                  <span className="tiny muted">{tx('هامش الربح', 'Margin')}</span>
                  <strong style={{ color: margin < 0.25 ? 'var(--bad)' : undefined }}>{pct(margin, 1)}</strong>
                </div>
                <div>
                  <span className="tiny muted">{tx('نسبة الخصم المعروضة', 'Shown discount')}</span>
                  <strong>{d.compareAt && d.compareAt > d.price ? pct(1 - d.price / d.compareAt, 0) : '—'}</strong>
                </div>
              </div>
              {d.price > 0 && profitUnit < 0 && (
                <p className="small" style={{ color: 'var(--bad)' }}>
                  {tx('التكلفة أعلى من السعر، وكل بيعة هتخسّر. مراجعة التكلفة أو رفع السعر مطلوبة.', 'Cost is above price, so every sale loses money. Check the cost or raise the price.')}
                </p>
              )}
              {d.price > 0 && profitUnit >= 0 && margin < 0.25 && (
                <p className="small muted">
                  {tx('الهامش أقل من 25٪، ومع خصم 10٪ ورسوم الدفع عند الاستلام ممكن يقرب من الصفر.', 'Margin is under 25%. A 10% code plus COD fees can take it close to zero.')}
                </p>
              )}
            </div>,
          )}

          {pane(
            tx('المخزون والتشغيلات', 'Stock and lots'),
            <div className="stack">
              <div className="grid grid-3">
                <Field label="SKU" htmlFor="f-sku" error={errors.sku}>
                  <input id="f-sku" className="input num" dir="ltr" value={d.sku} aria-invalid={!!errors.sku} onChange={(e) => set('sku', e.target.value)} />
                </Field>
                <Field label={tx('الباركود', 'Barcode')} htmlFor="f-barcode" hint={tx('EAN-13 من على العبوة', 'EAN-13 from the pack')}>
                  <input id="f-barcode" className="input num" dir="ltr" inputMode="numeric" value={d.barcode} onChange={(e) => set('barcode', e.target.value)} />
                </Field>
                {numInput('lowStockAt', tx('تنبيه المخزون القليل عند', 'Low stock alert at'), tx('عدد القطع', 'Units'))}
              </div>
              <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{tx('التشغيلة', 'Lot')}</th>
                      <th className="t-end">{tx('الكمية', 'Qty')}</th>
                      <th>{tx('الصلاحية', 'Expiry')}</th>
                      <th>{tx('الاستلام', 'Received')}</th>
                      <th>{tx('الشحنة', 'Shipment')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...batches]
                      .sort((a, b) => a.expiry.localeCompare(b.expiry))
                      .map((b) => {
                        const du = daysUntil(b.expiry)
                        return (
                          <tr key={b.id}>
                            <td className="num">{b.lot}</td>
                            <td className="t-num">
                              <span className="core-adjust">
                                <button className="btn btn--ghost btn--sm btn--icon" onClick={() => bump(b, -1)} disabled={b.qty <= 0} aria-label={tx('نقص واحد', 'Decrease by one')}>
                                  <Minus size={14} />
                                </button>
                                <span style={{ minWidth: '3ch', textAlign: 'center' }}>{num(b.qty)}</span>
                                <button className="btn btn--ghost btn--sm btn--icon" onClick={() => bump(b, 1)} aria-label={tx('زوّد واحد', 'Increase by one')}>
                                  <Plus size={14} />
                                </button>
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {date(b.expiry)}
                              <div className="tiny" style={{ color: du < 0 ? 'var(--bad)' : du <= settings.expiryWarnDays ? 'var(--warn)' : 'var(--fg-3)' }}>
                                {du < 0 ? tx('منتهية', 'Expired') : tx(`باقي ${num(du)} يوم`, `${du} days left`)}
                              </div>
                            </td>
                            <td className="muted small">{date(b.receivedAt)}</td>
                            <td className="muted small">{b.shipmentId === 'manual' ? tx('يدوي', 'Manual') : b.shipmentId.toUpperCase()}</td>
                          </tr>
                        )
                      })}
                    {!batches.length && (
                      <tr>
                        <td colSpan={5} className="muted small">
                          {tx('مفيش تشغيلات لسه. إضافة أول تشغيلة من تحت.', 'No lots yet. Add the first one below.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="small muted num">{tx(`إجمالي المخزون ${num(onHand)} قطعة`, `${num(onHand)} units on hand`)}</div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', alignItems: 'end' }}>
                <Field label={tx('رقم التشغيلة', 'Lot number')} htmlFor="nb-lot" error={nbErr.lot}>
                  <input id="nb-lot" className="input" dir="ltr" value={nb.lot} aria-invalid={!!nbErr.lot} onChange={(e) => setNb({ ...nb, lot: e.target.value })} />
                </Field>
                <Field label={tx('الكمية', 'Quantity')} htmlFor="nb-qty" error={nbErr.qty}>
                  <input id="nb-qty" className="input num" type="number" min={1} value={nb.qty} aria-invalid={!!nbErr.qty} onChange={(e) => setNb({ ...nb, qty: e.target.value })} />
                </Field>
                <Field label={tx('الصلاحية', 'Expiry')} htmlFor="nb-exp" error={nbErr.expiry}>
                  <input id="nb-exp" className="input" type="date" value={nb.expiry} aria-invalid={!!nbErr.expiry} onChange={(e) => setNb({ ...nb, expiry: e.target.value })} />
                </Field>
                <Field label={tx('من شحنة', 'From shipment')} htmlFor="nb-sh">
                  <select id="nb-sh" className="select" value={nb.shipmentId} onChange={(e) => setNb({ ...nb, shipmentId: e.target.value })}>
                    <option value="">{tx('إضافة يدوية', 'Manual entry')}</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id.toUpperCase()} {s.supplier}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className="btn" onClick={addNewBatch}>
                  <Plus size={16} aria-hidden />
                  {tx('إضافة تشغيلة', 'Add lot')}
                </button>
              </div>
            </div>,
            isNew ? tx('التشغيلات بتتحفظ مع المنتج', 'Lots are saved with the product') : tx('تعديلات التشغيلات بتتحفظ فورًا', 'Lot changes save immediately'),
          )}

          {pane(
            tx('شكل العبوة', 'Packaging'),
            <div className="grid grid-2">
              <div className="stack" style={{ gap: 12 }}>
                <Field label={tx('نوع العبوة', 'Container')} htmlFor="f-shape">
                  <select id="f-shape" className="select" value={d.visual.shape} onChange={(e) => set('visual', { ...d.visual, shape: e.target.value as Shape })}>
                    {SHAPES.map((s) => (
                      <option key={s} value={s}>
                        {pick(SHAPE_LABEL[s])}
                      </option>
                    ))}
                  </select>
                </Field>
                {(
                  [
                    ['body', tx('لون العبوة', 'Body')],
                    ['cap', tx('لون الغطا', 'Cap')],
                    ['label', tx('لون الملصق', 'Label')],
                    ['text', tx('لون الكتابة', 'Label text')],
                  ] as const
                ).map(([k, label]) => (
                  <Field key={k} label={label} htmlFor={`f-col-${k}`}>
                    <div className="core-color">
                      <input type="color" id={`f-col-${k}`} value={d.visual[k]} onChange={(e) => set('visual', { ...d.visual, [k]: e.target.value })} />
                      <input
                        className="input num"
                        dir="ltr"
                        value={d.visual[k]}
                        aria-label={`${label} hex`}
                        onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set('visual', { ...d.visual, [k]: e.target.value })}
                      />
                    </div>
                  </Field>
                ))}
              </div>
              <div className="core-visual" aria-label={tx('معاينة العبوة', 'Packaging preview')}>
                <ProductVisual visual={d.visual} brand={d.brand || 'Brand'} size={d.size} title={d.name.en || 'Preview'} />
              </div>
            </div>,
            tx('رسم مؤقت لحد ما صور المنتج الحقيقية تجهز', 'A drawn stand-in until real product photos exist'),
          )}
        </div>

        <div className="stack">
          {pane(
            tx('الحالة', 'Status'),
            <div className="stack" style={{ gap: 8 }}>
              <Seg<ProductStatus>
                label={tx('الحالة', 'Status')}
                value={d.status}
                onChange={(v) => set('status', v)}
                options={(['active', 'draft', 'archived'] as const).map((s) => ({ value: s, label: statusLabel[s] }))}
              />
              <span className="small muted">
                {d.status === 'active'
                  ? tx('ظاهر في المتجر وممكن يتطلب.', 'Visible in the store and can be ordered.')
                  : d.status === 'draft'
                    ? tx('مخفي عن المتجر لحد ما يتفعّل.', 'Hidden from the store until activated.')
                    : tx('مخفي، وبيفضل في الطلبات القديمة.', 'Hidden, and kept on past orders.')}
              </span>
            </div>,
          )}

          {pane(
            tx('التصنيف', 'Organization'),
            <div className="stack" style={{ gap: 12 }}>
              <Field label={tx('البراند', 'Brand')} htmlFor="f-brand" error={errors.brand}>
                <input id="f-brand" className="input" dir="ltr" list="brand-list" value={d.brand} aria-invalid={!!errors.brand} onChange={(e) => set('brand', e.target.value)} />
                <datalist id="brand-list">
                  {[...new Set(products.map((p) => p.brand))].sort().map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <Field label={tx('بلد المنشأ', 'Origin')} htmlFor="f-origin">
                  <select id="f-origin" className="select" value={d.origin} onChange={(e) => set('origin', e.target.value as Origin)}>
                    {ORIGINS.map((o) => (
                      <option key={o} value={o}>
                        {pick(originName(o))}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={tx('الحجم', 'Size')} htmlFor="f-size">
                  <input id="f-size" className="input" dir="ltr" placeholder="50 ml" value={d.size} onChange={(e) => set('size', e.target.value)} />
                </Field>
              </div>
              <Field label={tx('الفئة', 'Category')} htmlFor="f-cat">
                <select id="f-cat" className="select" value={d.category} onChange={(e) => set('category', e.target.value as Category)}>
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                    <option key={c} value={c}>
                      {pick(CATEGORY_LABEL[c])}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tx('خطوة الروتين', 'Routine step')} htmlFor="f-step">
                <select id="f-step" className="select" value={d.routineStep} onChange={(e) => set('routineStep', Number(e.target.value) as Product['routineStep'])}>
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <option key={s} value={s}>
                      {num(s)}. {pick(STEP_LABEL[s])}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="field">
                <span className="field__label">{tx('وقت الاستخدام', 'When to use')}</span>
                <div className="core-chips">
                  <Chip on={d.routineTime.includes('am')} onClick={() => set('routineTime', toggleIn(d.routineTime, 'am'))}>
                    {tx('الصبح', 'Morning')}
                  </Chip>
                  <Chip on={d.routineTime.includes('pm')} onClick={() => set('routineTime', toggleIn(d.routineTime, 'pm'))}>
                    {tx('بالليل', 'Evening')}
                  </Chip>
                </div>
              </div>
            </div>,
          )}

          {pane(
            tx('مناسب لمين', 'Skin fit'),
            <div className="stack" style={{ gap: 12 }}>
              <div className="field">
                <span className="field__label">{tx('أنواع البشرة', 'Skin types')}</span>
                <div className="core-chips">
                  {SKINS.map((s) => (
                    <Chip key={s} on={d.skinTypes.includes(s)} onClick={() => set('skinTypes', toggleIn(d.skinTypes, s))}>
                      {pick(SKIN_LABEL[s])}
                    </Chip>
                  ))}
                </div>
                {errors.skinTypes && <span className="field__error">{errors.skinTypes}</span>}
              </div>
              <div className="field">
                <span className="field__label">{tx('المشاكل اللي بيعالجها', 'Concerns')}</span>
                <div className="core-chips">
                  {CONCERNS.map((c) => (
                    <Chip key={c} on={d.concerns.includes(c)} onClick={() => set('concerns', toggleIn(d.concerns, c))}>
                      {pick(CONCERN_LABEL[c])}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>,
            tx('بيغذّي فلاتر المتجر وأداة الروتين', 'Feeds store filters and the routine finder'),
          )}

          {pane(
            tx('معاينة في جوجل', 'Search preview'),
            <div className="stack" style={{ gap: 8 }}>
              {serp('ar')}
              {serp('en')}
              <Field label={tx('رابط المنتج', 'URL handle')} htmlFor="f-slug" hint={d.slug ? undefined : tx('بيتولّد من البراند والاسم الإنجليزي', 'Generated from brand and English name')}>
                <input id="f-slug" className="input" dir="ltr" value={d.slug} placeholder={slug} onChange={(e) => set('slug', slugify(e.target.value))} />
              </Field>
            </div>,
          )}

          {pane(
            tx('كارت المتجر', 'Store card'),
            <div className="row" style={{ alignItems: 'stretch', gap: 12 }}>
              {card('ar')}
              {card('en')}
            </div>,
          )}
        </div>
      </div>

      <Drawer
        open={pendingNav !== null}
        onClose={() => setPendingNav(null)}
        title={tx('الخروج من غير حفظ؟', 'Leave without saving?')}
        footer={
          <>
            <button className="btn" onClick={() => setPendingNav(null)}>
              {tx('متابعة التعديل', 'Keep editing')}
            </button>
            <button
              className="btn btn--danger"
              onClick={() => {
                const to = pendingNav!
                setPendingNav(null)
                setDraft(base)
                bypass.current = true
                navigate(to)
              }}
            >
              {tx('تجاهل التغييرات والخروج', 'Discard and leave')}
            </button>
          </>
        }
      >
        <p className="small muted">{tx('التعديلات اللي على المنتج ده هتضيع لو خرجت دلوقتي.', 'Your edits to this product will be lost if you leave now.')}</p>
      </Drawer>

      <Drawer
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={tx('حذف المنتج؟', 'Delete product?')}
        footer={
          <>
            <button
              className="btn"
              onClick={() => {
                setProductStatus([d.id], 'archived')
                setBase({ ...d, status: 'archived' })
                setDraft({ ...d, status: 'archived' })
                setConfirmDelete(false)
                toast(tx('اتأرشف المنتج', 'Product archived'))
              }}
            >
              {tx('أرشفة بدل الحذف', 'Archive instead')}
            </button>
            <button className="btn btn--danger" onClick={doDelete}>
              {tx('حذف نهائي', 'Delete permanently')}
            </button>
          </>
        }
      >
        <div className="stack small">
          <p>{tx(`"${d.name.ar || d.name.en}" هيتشال من الكتالوج والمخزون (${num(onHand)} قطعة).`, `“${d.name.en || d.name.ar}” will be removed from the catalog and stock (${onHand} units).`)}</p>
          <p className="muted">{tx('الطلبات القديمة هتفضل محفوظة. الأرشفة بتخفيه من غير ما تمسح بياناته.', 'Past orders keep their history. Archiving hides it without losing its data.')}</p>
        </div>
      </Drawer>
    </>
  )
}
