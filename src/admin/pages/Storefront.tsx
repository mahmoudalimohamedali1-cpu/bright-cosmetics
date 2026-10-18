import { useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { CATEGORY_LABEL, CONCERN_LABEL, SKIN_LABEL } from '../../data/catalog'
import { BLOCK_LABEL, BUILT_IN_PAGES, PANEL_SHAPES, SHAPE_FIELDS, blankBlock, blankPanel, defaultStorefront, pageSlug, sanitizeStorefront } from '../../data/storefront'
import type { Bi } from '../../i18n'
import type { BuiltInPage, Category, Concern, HomeBlock, PageFrame, PanelShape, SkinType, StoreColumn, StoreLink, StoreNavItem, StorePage, StorefrontContent } from '../../data/types'
import { useI18n } from '../../i18n'
import { uid } from '../../lib/rand'
import { useStore } from '../../store'
import { Field, PageHeader, Pane, Seg, Switch, Tabs, useAdmin } from '../ui'

type Tab = 'identity' | 'nav' | 'home' | 'footer' | 'pages'

const CATS = Object.keys(CATEGORY_LABEL) as Category[]
const SKINS = Object.keys(SKIN_LABEL) as SkinType[]
const CONCERNS = Object.keys(CONCERN_LABEL) as Concern[]

function move<T>(list: T[], i: number, dir: -1 | 1) {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(i, 1)
  next.splice(j, 0, item)
  return next
}

function BiFields({
  label,
  value,
  onChange,
  area,
}: {
  label: string
  value: Bi
  onChange: (v: Bi) => void
  area?: boolean
}) {
  const { tx } = useI18n()
  const fid = useId()
  const Input = area ? 'textarea' : 'input'
  return (
    <div className="grid grid-2">
      <Field label={`${label} · ${tx('عربي', 'Arabic')}`} htmlFor={`${fid}-ar`}>
        <Input id={`${fid}-ar`} className={area ? 'textarea' : 'input'} dir="rtl" lang="ar" value={value.ar} autoComplete="off" onChange={(e) => onChange({ ...value, ar: e.target.value })} />
      </Field>
      <Field label={`${label} · ${tx('إنجليزي', 'English')}`} htmlFor={`${fid}-en`}>
        <Input id={`${fid}-en`} className={area ? 'textarea' : 'input'} dir="ltr" lang="en" value={value.en} autoComplete="off" onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </Field>
    </div>
  )
}

function HrefField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const { tx } = useI18n()
  const fid = useId()
  return (
    <Field label={label} htmlFor={fid} hint={hint ?? tx('صفحة داخلية تبدأ بـ / ، أو https:// ، أو mailto:store ، أو whatsapp:store', 'An internal path starting with /, or https://, mailto:store, or whatsapp:store')}>
      <input id={fid} className="input" dir="ltr" value={value} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
      <span className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
        {[
          ['/shop', tx('المتجر', 'Shop')],
          ['/routine', tx('الروتين', 'Quiz')],
          ['mailto:store', tx('إيميل المتجر', 'Store email')],
          ['whatsapp:store', tx('واتساب المتجر', 'Store WhatsApp')],
        ].map(([href, name]) => (
          <button key={href} type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(href)}>
            {name}
          </button>
        ))}
      </span>
    </Field>
  )
}

function ProductSlugs({ slugs, onChange, hint }: { slugs: string[]; onChange: (v: string[]) => void; hint?: string }) {
  const { tx, pick } = useI18n()
  const all = useStore((s) => s.products)
  const products = useMemo(() => all.filter((p) => p.status !== 'archived'), [all])
  const fid = useId()
  return (
    <Field label={tx('المنتجات', 'Products')} hint={hint} htmlFor={fid}>
      <ul className="stack" style={{ gap: 6 }}>
        {slugs.map((slug) => {
          const p = products.find((x) => x.slug === slug)
          return (
            <li key={slug} className="row">
              <span className="ellipsis">{p ? `${p.brand} — ${pick(p.name)}` : slug}</span>
              <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('شيلي', 'Remove')} onClick={() => onChange(slugs.filter((s) => s !== slug))}>
                <Trash2 size={14} />
              </button>
            </li>
          )
        })}
      </ul>
      <select
        id={fid}
        className="select"
        value=""
        onChange={(e) => {
          const v = e.target.value
          if (v && !slugs.includes(v)) onChange([...slugs, v])
        }}
      >
        <option value="">{tx('ضيفي منتج', 'Add a product')}</option>
        {products.map((p) => (
          <option key={p.id} value={p.slug}>
            {p.brand} — {pick(p.name)}
          </option>
        ))}
      </select>
    </Field>
  )
}

function Row({
  title,
  sub,
  on,
  onToggle,
  onUp,
  onDown,
  onDelete,
  selected,
  onSelect,
}: {
  title: string
  sub?: string
  on?: boolean
  onToggle?: (v: boolean) => void
  onUp?: () => void
  onDown?: () => void
  onDelete?: () => void
  selected: boolean
  onSelect: () => void
}) {
  const { tx } = useI18n()
  return (
    <li className={`cms-item ${on === false ? 'cms-off' : ''}`} data-on={selected || undefined}>
      {onToggle && <Switch checked={on !== false} onChange={onToggle} label={tx(`إظهار ${title}`, `Show ${title}`)} />}
      <button type="button" className="cms-item__pick" onClick={onSelect}>
        {title || tx('من غير عنوان', 'Untitled')}
        {sub && <small>{sub}</small>}
      </button>
      {onUp && (
        <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('فوق', 'Up')} onClick={onUp}>
          <ChevronUp size={16} />
        </button>
      )}
      {onDown && (
        <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('تحت', 'Down')} onClick={onDown}>
          <ChevronDown size={16} />
        </button>
      )}
      {onDelete && (
        <button type="button" className="btn btn--ghost btn--sm btn--icon btn--danger" aria-label={tx('احذفي', 'Delete')} onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      )}
    </li>
  )
}

function BlockForm({ block, onChange }: { block: HomeBlock; onChange: (b: HomeBlock) => void }) {
  const { tx, pick } = useI18n()
  const all = useStore((s) => s.products)
  const brands = useMemo(() => [...new Set(all.map((p) => p.brand))].sort(), [all])
  const fid = useId()
  if (block.type === 'panel') return <PanelForm block={block} onChange={onChange} />
  if (block.type === 'quotes') {
    return <p className="field__hint">{tx('الآراء بتتجاب من التقييمات المنشورة بخمس نجوم. ضيفي أو امسحي رأي من صفحة التقييمات.', 'Quotes come from published five-star reviews. Add or remove them on the Reviews page.')} <Link to="/admin/reviews">{tx('التقييمات', 'Reviews')}</Link></p>
  }
  return (
    <div className="stack">
      {(block.type === 'hero' || block.type === 'bestsellers' || block.type === 'rail' || block.type === 'categories' || block.type === 'promises' || block.type === 'lot' || block.type === 'routines' || block.type === 'brands' || block.type === 'text') && (
        <BiFields
          label={tx('العنوان', 'Title')}
          area={block.type === 'bestsellers' || block.type === 'promises' || block.type === 'lot'}
          value={'headline' in block ? block.headline : block.title}
          onChange={(v) => onChange({ ...block, ...('headline' in block ? { headline: v } : { title: v }) })}
        />
      )}
      {'sub' in block && <BiFields label={tx('السطر اللي تحت', 'Subtitle')} value={block.sub} onChange={(sub) => onChange({ ...block, sub })} />}
      {'body' in block && <BiFields label={tx('النص', 'Body')} area value={block.body} onChange={(body) => onChange({ ...block, body })} />}
      {block.type === 'marquee' && (
        <>
          <BiFields label={tx('الجملة', 'Line')} value={block.text} onChange={(text) => onChange({ ...block, text })} />
          <BiFields label={tx('وصف للقارئ', 'Accessible label')} value={block.label} onChange={(label) => onChange({ ...block, label })} />
        </>
      )}
      {'cta' in block && <BiFields label={tx('زر', 'Button')} value={block.cta} onChange={(cta) => onChange({ ...block, cta })} />}
      {'href' in block && <HrefField label={tx('لينك الزر', 'Button link')} value={block.href} onChange={(href) => onChange({ ...block, href })} />}
      {'limit' in block && (
        <Field label={tx('عدد المنتجات', 'How many products')} htmlFor={`${fid}-limit`}>
          <input id={`${fid}-limit`} className="input" dir="ltr" type="number" min={1} max={24} value={block.limit} onChange={(e) => onChange({ ...block, limit: Number(e.target.value) })} />
        </Field>
      )}
      {block.type === 'rail' && (
        <>
          <Field label={tx('المنتجات منين', 'Where products come from')} htmlFor={`${fid}-source`}>
            <select id={`${fid}-source`} className="select" value={block.source} onChange={(e) => onChange({ ...block, source: e.target.value as typeof block.source })}>
              <option value="manual">{tx('منتجات أختارها', 'Products I pick')}</option>
              <option value="best">{tx('الأكثر مبيعًا', 'Bestsellers')}</option>
              <option value="offers">{tx('اللي عليها خصم', 'On sale')}</option>
              <option value="new">{tx('الأحدث', 'Newest')}</option>
              <option value="brand">{tx('ماركة', 'A brand')}</option>
              <option value="category">{tx('قسم', 'A category')}</option>
            </select>
          </Field>
          <Seg
            label={tx('الخلفية', 'Background')}
            value={block.tone}
            onChange={(tone) => onChange({ ...block, tone })}
            options={[
              { value: 'plain', label: tx('عادي', 'Plain') },
              { value: 'blush', label: tx('وردي', 'Blush') },
            ]}
          />
          {block.source === 'brand' && (
            <Field label={tx('الماركة', 'Brand')} htmlFor={`${fid}-brand`}>
              <select id={`${fid}-brand`} className="select" value={block.brand} onChange={(e) => onChange({ ...block, brand: e.target.value })}>
                <option value="">{tx('اختاري', 'Choose')}</option>
                {brands.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </Field>
          )}
          {block.source === 'category' && (
            <Field label={tx('القسم', 'Category')} htmlFor={`${fid}-cat`}>
              <select id={`${fid}-cat`} className="select" value={block.category} onChange={(e) => onChange({ ...block, category: e.target.value })}>
                <option value="">{tx('اختاري', 'Choose')}</option>
                {CATS.map((c) => (
                  <option key={c} value={c}>{pick(CATEGORY_LABEL[c])}</option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}
      {'slugs' in block && (
        <ProductSlugs
          slugs={block.slugs}
          onChange={(slugs) => onChange({ ...block, slugs })}
          hint={block.type === 'promises' ? tx('صور العبوات جنب النص. فاضي = من غير صور.', 'Packshots beside the copy. Empty = no photos.') : tx('فاضي = الاختيار التلقائي للقسم.', 'Empty = this section picks automatically.')}
        />
      )}
      {(block.type === 'spin' || block.type === 'lot') && (
        <ProductSlugs
          slugs={block.slug ? [block.slug] : []}
          onChange={(slugs) => onChange({ ...block, slug: slugs.at(-1) ?? '' })}
          hint={tx('منتج واحد. فاضي = الاختيار التلقائي.', 'One product. Empty = the automatic pick.')}
        />
      )}
      {block.type === 'promises' && (
        <ItemList
          items={block.items}
          onChange={(items) => onChange({ ...block, items })}
          blank={() => ({ id: uid('p'), title: { ar: '', en: '' }, body: { ar: '', en: '' } })}
          render={(it, set) => (
            <>
              <BiFields label={tx('العنوان', 'Title')} value={it.title} onChange={(title) => set({ ...it, title })} />
              <BiFields label={tx('التفصيلة', 'Detail')} area value={it.body} onChange={(body) => set({ ...it, body })} />
            </>
          )}
        />
      )}
      {block.type === 'routines' && (
        <ItemList
          items={block.cards}
          onChange={(cards) => onChange({ ...block, cards })}
          blank={() => ({ id: uid('r'), title: { ar: '', en: '' }, href: '/shop', badge: { ar: '', en: '' }, skin: '', concern: '' })}
          render={(card, set) => (
            <>
              <BiFields label={tx('اسم الروتين', 'Routine name')} value={card.title} onChange={(title) => set({ ...card, title })} />
              <BiFields label={tx('شارة', 'Badge')} value={card.badge} onChange={(badge) => set({ ...card, badge })} />
              <HrefField label={tx('اللينك', 'Link')} value={card.href} onChange={(href) => set({ ...card, href })} />
              <div className="grid grid-2">
                <Field label={tx('نوع البشرة', 'Skin type')} htmlFor={`${fid}-skin-${card.id}`}>
                  <select id={`${fid}-skin-${card.id}`} className="select" value={card.skin} onChange={(e) => set({ ...card, skin: e.target.value })}>
                    <option value="">{tx('أي نوع', 'Any')}</option>
                    {SKINS.map((s) => (
                      <option key={s} value={s}>{pick(SKIN_LABEL[s])}</option>
                    ))}
                  </select>
                </Field>
                <Field label={tx('المشكلة', 'Concern')} htmlFor={`${fid}-concern-${card.id}`}>
                  <select id={`${fid}-concern-${card.id}`} className="select" value={card.concern} onChange={(e) => set({ ...card, concern: e.target.value })}>
                    <option value="">{tx('أي مشكلة', 'Any')}</option>
                    {CONCERNS.map((c) => (
                      <option key={c} value={c}>{pick(CONCERN_LABEL[c])}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}
        />
      )}
    </div>
  )
}

function ItemList<T extends { id: string }>({
  items,
  onChange,
  blank,
  render,
}: {
  items: T[]
  onChange: (v: T[]) => void
  blank: () => T
  render: (item: T, set: (next: T) => void) => ReactNode
}) {
  const { tx } = useI18n()
  return (
    <div className="stack">
      {items.map((it, i) => (
        <Pane key={it.id} title={tx(`عنصر ${i + 1}`, `Item ${i + 1}`)} actions={
          <span className="row">
            <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('فوق', 'Up')} onClick={() => onChange(move(items, i, -1))}><ChevronUp size={14} /></button>
            <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('تحت', 'Down')} onClick={() => onChange(move(items, i, 1))}><ChevronDown size={14} /></button>
            <button type="button" className="btn btn--ghost btn--sm btn--icon btn--danger" aria-label={tx('احذفي', 'Delete')} onClick={() => onChange(items.filter((x) => x.id !== it.id))}><Trash2 size={14} /></button>
          </span>
        }>
          {render(it, (next) => onChange(items.map((x) => (x.id === it.id ? next : x))))}
        </Pane>
      ))}
      <button type="button" className="btn btn--sm" onClick={() => onChange([...items, blank()])}>
        <Plus size={14} /> {tx('ضيفي عنصر', 'Add item')}
      </button>
    </div>
  )
}

function LinksEditor({ links, onChange }: { links: StoreLink[]; onChange: (v: StoreLink[]) => void }) {
  const { tx } = useI18n()
  return (
    <ItemList
      items={links}
      onChange={onChange}
      blank={() => ({ id: uid('l'), label: { ar: '', en: '' }, href: '/shop' })}
      render={(link, set) => (
        <>
          <BiFields label={tx('الاسم', 'Label')} value={link.label} onChange={(label) => set({ ...link, label })} />
          <HrefField label={tx('اللينك', 'Link')} value={link.href} onChange={(href) => set({ ...link, href })} />
        </>
      )}
    />
  )
}

function shapeName(block: HomeBlock, pick: (b: { ar: string; en: string }) => string) {
  if (block.type !== 'panel') return pick(BLOCK_LABEL[block.type])
  return pick(PANEL_SHAPES.find((s) => s.id === block.shape) ?? BLOCK_LABEL.panel)
}

function ShapeGallery({ value, onPick }: { value?: PanelShape; onPick: (shape: PanelShape) => void }) {
  const { pick } = useI18n()
  return (
    <div className="shape-pick">
      {PANEL_SHAPES.map((s) => (
        <button key={s.id} type="button" className="shape-card" aria-pressed={value === s.id} onClick={() => onPick(s.id)}>
          <span className={`shape-mini shape-mini--${s.id}`} aria-hidden="true" />
          <span>{pick(s)}</span>
        </button>
      ))}
    </div>
  )
}

function PanelForm({ block, onChange }: { block: Extract<HomeBlock, { type: 'panel' }>; onChange: (b: HomeBlock) => void }) {
  const { tx } = useI18n()
  const fields = SHAPE_FIELDS[block.shape]
  const set = (patch: Partial<typeof block>) => onChange({ ...block, ...patch })
  return (
    <div className="stack">
      <ShapeGallery value={block.shape} onPick={(shape) => set({ shape })} />
      {fields.includes('title') && <BiFields label={tx('العنوان', 'Title')} value={block.title} onChange={(title) => set({ title })} />}
      {fields.includes('sub') && <BiFields label={tx('السطر اللي تحت', 'Line under the title')} value={block.sub} onChange={(sub) => set({ sub })} />}
      {fields.includes('body') && <BiFields label={tx('النص', 'Text')} area value={block.body} onChange={(body) => set({ body })} />}
      {fields.includes('cta') && (
        <>
          <BiFields label={tx('الزر', 'Button')} value={block.cta} onChange={(cta) => set({ cta })} />
          <HrefField label={tx('لينك الزر', 'Button link')} value={block.href} onChange={(href) => set({ href })} />
        </>
      )}
      {fields.includes('slugs') && (
        <ProductSlugs slugs={block.slugs} onChange={(slugs) => set({ slugs })} hint={tx('فاضي = أول العبوات في المتجر.', 'Empty = the first bottles in the shop.')} />
      )}
      {fields.includes('items') && (
        <ItemList
          items={block.items}
          onChange={(items) => set({ items })}
          blank={() => ({ id: uid('i'), title: { ar: '', en: '' }, body: { ar: '', en: '' } })}
          render={(it, update) => (
            <>
              <BiFields label={tx('العنوان', 'Title')} value={it.title} onChange={(title) => update({ ...it, title })} />
              {block.shape !== 'claims' && <BiFields label={tx('التفصيلة', 'Detail')} value={it.body} onChange={(body) => update({ ...it, body })} />}
            </>
          )}
        />
      )}
    </div>
  )
}

function SectionStack({ blocks, onChange }: { blocks: HomeBlock[]; onChange: (next: HomeBlock[]) => void }) {
  const { tx, pick } = useI18n()
  const [sel, setSel] = useState<string>()
  const [addType, setAddType] = useState<HomeBlock['type'] | ''>('')
  const block = blocks.find((b) => b.id === sel)
  return (
    <div className="stack">
      <Pane title={tx('اختاري شكل وأضيفيه', 'Pick a shape and add it')} description={tx('تقدري تضيفي أكتر من قسم. كل قسم بشكله، والترتيب هو شكل الصفحة.', 'Add more than one. Each section keeps its own shape, and the order is the page.')}>
        <ShapeGallery onPick={(shape) => {
          const next = blankPanel(shape)
          onChange([...blocks, next])
          setSel(next.id)
        }} />
      </Pane>
    <div className="grid grid-2">
      <Pane title={tx('الأقسام', 'Sections')} description={tx('اللي مقفول مش هيظهر. الحذف بيشيله.', 'Off sections are hidden. Delete removes them.')} flush>
        <ul>
          {blocks.map((b, i) => (
            <Row
              key={b.id}
              title={shapeName(b, pick)}
              sub={'title' in b ? pick(b.title) : 'headline' in b ? pick(b.headline) : undefined}
              on={b.enabled}
              onToggle={(enabled) => onChange(blocks.map((x) => (x.id === b.id ? { ...x, enabled } : x)))}
              onUp={() => onChange(move(blocks, i, -1))}
              onDown={() => onChange(move(blocks, i, 1))}
              onDelete={() => onChange(blocks.filter((x) => x.id !== b.id))}
              selected={sel === b.id}
              onSelect={() => setSel(b.id)}
            />
          ))}
        </ul>
      </Pane>
      <Pane title={block ? shapeName(block, pick) : tx('تعديل القسم', 'Edit section')}>
        {block ? <BlockForm block={block} onChange={(next) => onChange(blocks.map((x) => (x.id === next.id ? next : x)))} /> : <p className="field__hint">{tx('اختاري قسم، أو اضيفي شكل من فوق.', 'Pick a section, or add a shape above.')}</p>}
        <details className="shape-ready">
          <summary>{tx('أقسام جاهزة', 'Ready-made sections')}</summary>
          <select
            className="select"
            value={addType}
            aria-label={tx('ضيفي قسم جاهز', 'Add a ready-made section')}
            onChange={(e) => {
              const type = e.target.value as HomeBlock['type']
              if (!type) return
              const next = blankBlock(type)
              onChange([...blocks, next])
              setSel(next.id)
              setAddType('')
            }}
          >
            <option value="">{tx('هيرو، شريط، روتينات…', 'Hero, row, routines…')}</option>
            {(Object.keys(BLOCK_LABEL) as HomeBlock['type'][]).filter((type) => type !== 'panel').map((type) => (
              <option key={type} value={type}>{pick(BLOCK_LABEL[type])}</option>
            ))}
          </select>
        </details>
      </Pane>
    </div>
    </div>
  )
}

export default function StorefrontPage() {
  const { tx, pick } = useI18n()
  const { toast, staff } = useAdmin()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const log = useStore((s) => s.log)
  const [tab, setTab] = useState<Tab>('home')
  const [draft, setDraft] = useState<StorefrontContent>(() => sanitizeStorefront(settings.storefront ?? defaultStorefront()))
  const [ann, setAnn] = useState(settings.announcement)
  const [dirty, setDirty] = useState(false)
  const [sel, setSel] = useState<string | undefined>()
  const [pageId, setPageId] = useState<string | undefined>()
  const [frameId, setFrameId] = useState<BuiltInPage | undefined>()
  const incomingKey = JSON.stringify(settings.storefront ?? null) + JSON.stringify(settings.announcement)
  const [syncKey, setSyncKey] = useState(incomingKey)
  if (!dirty && syncKey !== incomingKey) {
    setSyncKey(incomingKey)
    setDraft(sanitizeStorefront(settings.storefront ?? defaultStorefront()))
    setAnn(settings.announcement)
  }

  const edit = (fn: (d: StorefrontContent) => StorefrontContent) => {
    setDirty(true)
    setDraft(fn)
  }
  const saved = sanitizeStorefront(settings.storefront ?? defaultStorefront())
  const unsaved = dirty || JSON.stringify(ann) !== JSON.stringify(settings.announcement) || JSON.stringify(draft) !== JSON.stringify(saved)

  const save = () => {
    if (ann.ar.length > 120 || ann.en.length > 120) {
      toast(tx('شريط الإعلان أقصاه 120 حرف', 'Announcement is 120 characters max'))
      setTab('identity')
      return
    }
    const next = sanitizeStorefront(finalizeSlugs(draft))
    updateSettings({
      storefront: next,
      announcement: { ar: ann.ar.trim(), en: ann.en.trim() },
    })
    log(staff, { ar: 'حدّث واجهة المتجر', en: 'Updated the storefront' }, '/admin/storefront')
    setDraft(next)
    setDirty(false)
    toast(tx('اتحفظت، وهتظهر في المتجر', 'Saved. It is live on the store.'))
  }

  const navItem = draft.nav.find((n) => n.id === sel)
  const page = draft.pages.find((p) => p.id === pageId)
  const frame = draft.frames.find((f) => f.id === frameId)

  return (
    <>
      <PageHeader
        title={tx('واجهة المتجر', 'Storefront')}
        description={tx('أضيفي أقسام على الرئيسية أو أي صفحة، ورتّبيها. شكل الصفحة هو الأقسام اللي فيها. الحفظ بيظهر فورًا.', 'Add sections to the homepage or any page, and reorder them. A page’s shape is its sections. Saving shows immediately.')}
        actions={
          <span className="row">
            <Link className="btn btn--ghost btn--sm" to="/" target="_blank">
              {tx('افتحي المتجر', 'View store')}
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" disabled={!unsaved} onClick={() => { setDirty(false); setDraft(saved); setAnn(settings.announcement) }}>
              {tx('ارجعي', 'Discard')}
            </button>
            <button type="button" className="btn btn--primary btn--sm" disabled={!unsaved} onClick={save}>
              {tx('احفظي الواجهة', 'Save storefront')}
            </button>
          </span>
        }
      />
      <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        <span className="field__hint">{tx('السجلات اللي بتغذي المتجر:', 'Records that already feed the shop:')}</span>
        <Link className="btn btn--ghost btn--sm" to="/admin/products">{tx('المنتجات', 'Products')}</Link>
        <Link className="btn btn--ghost btn--sm" to="/admin/discounts">{tx('الخصومات', 'Discounts')}</Link>
        <Link className="btn btn--ghost btn--sm" to="/admin/reviews">{tx('التقييمات', 'Reviews')}</Link>
        <Link className="btn btn--ghost btn--sm" to="/admin/shipping">{tx('الشحن', 'Shipping')}</Link>
        <Link className="btn btn--ghost btn--sm" to="/admin/settings">{tx('الاسم وواتساب', 'Name and WhatsApp')}</Link>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'home', label: tx('الرئيسية', 'Home'), count: draft.blocks.filter((b) => b.enabled).length },
          { value: 'nav', label: tx('القائمة', 'Menu'), count: draft.nav.filter((n) => n.enabled).length },
          { value: 'footer', label: tx('الفوتر', 'Footer') },
          { value: 'pages', label: tx('صفحات', 'Pages'), count: draft.pages.length },
          { value: 'identity', label: tx('الهوية', 'Identity') },
        ]}
      />
      <div className="stack" style={{ marginTop: 16 }}>
        {tab === 'identity' && (
          <>
            <Pane title={tx('العنوان والوصف', 'Title and description')} description={tx('عنوان التبويب ووصف جوجل', 'The browser tab and the search description')}>
              <div className="stack">
                <BiFields label={tx('عنوان الموقع', 'Site title')} value={draft.seoTitle} onChange={(seoTitle) => edit((d) => ({ ...d, seoTitle }))} />
                <BiFields label={tx('الوصف', 'Description')} area value={draft.seoDescription} onChange={(seoDescription) => edit((d) => ({ ...d, seoDescription }))} />
                <BiFields label={tx('الشعار الكبير في الفوتر', 'Footer slogan')} value={draft.slogan} onChange={(slogan) => edit((d) => ({ ...d, slogan }))} />
              </div>
            </Pane>
            <Pane title={tx('شريط أعلى المتجر', 'Top bar')}>
              <div className="stack">
                <div className="grid grid-2">
                  <Field htmlFor="sf-ann-ar" label={tx('إعلان عربي', 'Arabic announcement')} hint={`${ann.ar.length} / 120`} error={ann.ar.length > 120 ? tx('طويل', 'Too long') : undefined}>
                    <input id="sf-ann-ar" className="input" dir="rtl" lang="ar" value={ann.ar} onChange={(e) => { setDirty(true); setAnn({ ...ann, ar: e.target.value }) }} />
                  </Field>
                  <Field htmlFor="sf-ann-en" label={tx('إعلان إنجليزي', 'English announcement')} hint={`${ann.en.length} / 120`} error={ann.en.length > 120 ? tx('طويل', 'Too long') : undefined}>
                    <input id="sf-ann-en" className="input" dir="ltr" lang="en" value={ann.en} onChange={(e) => { setDirty(true); setAnn({ ...ann, en: e.target.value }) }} />
                  </Field>
                </div>
                <ItemList
                  items={draft.ticker.map((t, i) => ({ id: `tk${i}`, ...t }))}
                  onChange={(items) => edit((d) => ({ ...d, ticker: items.map(({ ar, en }) => ({ ar, en })) }))}
                  blank={() => ({ id: uid('t'), ar: '', en: '' })}
                  render={(it, set) => <BiFields label={tx('سطر', 'Line')} value={it} onChange={(v) => set({ ...it, ...v })} />}
                />
              </div>
            </Pane>
          </>
        )}

        {tab === 'nav' && (
          <div className="grid grid-2">
            <Pane title={tx('عناصر القائمة', 'Menu items')} flush>
              <ul>
                {draft.nav.map((item, i) => (
                  <Row
                    key={item.id}
                    title={pick(item.label)}
                    sub={item.kind === 'link' ? item.href : item.kind}
                    on={item.enabled}
                    onToggle={(enabled) => edit((d) => ({ ...d, nav: d.nav.map((n) => (n.id === item.id ? { ...n, enabled } : n)) }))}
                    onUp={() => edit((d) => ({ ...d, nav: move(d.nav, i, -1) }))}
                    onDown={() => edit((d) => ({ ...d, nav: move(d.nav, i, 1) }))}
                    onDelete={() => edit((d) => ({ ...d, nav: d.nav.filter((n) => n.id !== item.id) }))}
                    selected={sel === item.id}
                    onSelect={() => setSel(item.id)}
                  />
                ))}
              </ul>
              <div className="pane__foot">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    const item: StoreNavItem = { id: uid('n'), label: { ar: 'رابط', en: 'Link' }, href: '/shop', kind: 'link', enabled: true, children: [] }
                    edit((d) => ({ ...d, nav: [...d.nav, item] }))
                    setSel(item.id)
                  }}
                >
                  <Plus size={14} aria-hidden /> {tx('ضيفي رابط', 'Add link')}
                </button>
              </div>
            </Pane>
            <Pane title={tx('تعديل', 'Edit')}>
              {navItem ? (
                <div className="stack">
                  <BiFields label={tx('الاسم', 'Label')} value={navItem.label} onChange={(label) => edit((d) => ({ ...d, nav: d.nav.map((n) => (n.id === navItem.id ? { ...n, label } : n)) }))} />
                  <Field label={tx('النوع', 'Type')} htmlFor="sf-nav-kind">
                    <select id="sf-nav-kind" className="select" value={navItem.kind} onChange={(e) => edit((d) => ({ ...d, nav: d.nav.map((n) => (n.id === navItem.id ? { ...n, kind: e.target.value as StoreNavItem['kind'] } : n)) }))}>
                      <option value="link">{tx('لينك', 'Link')}</option>
                      <option value="categories">{tx('قائمة الأقسام', 'Category menu')}</option>
                      <option value="brands">{tx('قائمة الماركات', 'Brand menu')}</option>
                    </select>
                  </Field>
                  {navItem.kind === 'link' && (
                    <HrefField label={tx('اللينك', 'Link')} value={navItem.href} onChange={(href) => edit((d) => ({ ...d, nav: d.nav.map((n) => (n.id === navItem.id ? { ...n, href } : n)) }))} />
                  )}
                  {navItem.kind === 'categories' && (
                    <>
                      <p className="field__hint">{tx('الأقسام نفسها بتيجي من المنتجات. هنا اللينكات الزيادة جوا القائمة.', 'Categories come from products. These are the extra links inside the menu.')}</p>
                      <LinksEditor links={navItem.children} onChange={(children) => edit((d) => ({ ...d, nav: d.nav.map((n) => (n.id === navItem.id ? { ...n, children } : n)) }))} />
                    </>
                  )}
                </div>
              ) : (
                <p className="field__hint">{tx('اختاري عنصر من القائمة.', 'Pick a menu item.')}</p>
              )}
            </Pane>
          </div>
        )}

        {tab === 'home' && (
          <div className="stack">
            <SectionStack blocks={draft.blocks} onChange={(blocks) => edit((d) => ({ ...d, blocks }))} />
            <button type="button" className="btn btn--ghost btn--sm" title={tx('بترجّع أقسام الرئيسية والقائمة والفوتر. الصفحات اللي كتبتيها بتفضل.', 'Restores the homepage, menu and footer. Pages you wrote stay.')} onClick={() => edit((d) => ({ ...defaultStorefront(), pages: d.pages, frames: d.frames }))}>
              {tx('رجّعي النسخة الأصلية', 'Restore the original')}
            </button>
          </div>
        )}

        {tab === 'footer' && (
          <div className="stack">
            <Pane title={tx('نادي برايت', 'Bright club')}>
              <div className="stack">
                <BiFields label={tx('العنوان', 'Title')} value={draft.footer.clubTitle} onChange={(clubTitle) => edit((d) => ({ ...d, footer: { ...d.footer, clubTitle } }))} />
                <BiFields label={tx('ملاحظة', 'Note')} value={draft.footer.clubNote} onChange={(clubNote) => edit((d) => ({ ...d, footer: { ...d.footer, clubNote } }))} />
                <BiFields label={tx('رسالة بعد التسجيل', 'After signup')} value={draft.footer.clubOk} onChange={(clubOk) => edit((d) => ({ ...d, footer: { ...d.footer, clubOk } }))} />
              </div>
            </Pane>
            {draft.footer.columns.map((col, i) => (
              <Pane
                key={col.id}
                title={pick(col.title) || tx('عمود', 'Column')}
                actions={
                  <span className="row">
                    <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('فوق', 'Up')} onClick={() => edit((d) => ({ ...d, footer: { ...d.footer, columns: move(d.footer.columns, i, -1) } }))}><ChevronUp size={14} /></button>
                    <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={tx('تحت', 'Down')} onClick={() => edit((d) => ({ ...d, footer: { ...d.footer, columns: move(d.footer.columns, i, 1) } }))}><ChevronDown size={14} /></button>
                    <button type="button" className="btn btn--ghost btn--sm btn--danger" onClick={() => edit((d) => ({ ...d, footer: { ...d.footer, columns: d.footer.columns.filter((c) => c.id !== col.id) } }))}>{tx('احذفي', 'Delete')}</button>
                  </span>
                }
              >
                <ColumnForm col={col} onChange={(next) => edit((d) => ({ ...d, footer: { ...d.footer, columns: d.footer.columns.map((c) => (c.id === next.id ? next : c)) } }))} />
              </Pane>
            ))}
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => edit((d) => ({ ...d, footer: { ...d.footer, columns: [...d.footer.columns, { id: uid('c'), title: { ar: 'عمود', en: 'Column' }, mode: 'links', links: [], limit: 6 }] } }))}
            >
              <Plus size={14} aria-hidden /> {tx('ضيفي عمود', 'Add column')}
            </button>
            <Pane title={tx('سطر الشحن', 'Shipping line')}>
              <div className="stack">
                <Seg
                  label={tx('النص', 'Copy')}
                  value={draft.footer.legalMode}
                  onChange={(legalMode) => edit((d) => ({ ...d, footer: { ...d.footer, legalMode } }))}
                  options={[
                    { value: 'auto', label: tx('من مناطق الشحن', 'From shipping zones') },
                    { value: 'custom', label: tx('نص أنا أكتبه', 'Text I write') },
                  ]}
                />
                {draft.footer.legalMode === 'custom' && (
                  <BiFields label={tx('النص', 'Text')} area value={draft.footer.legal} onChange={(legal) => edit((d) => ({ ...d, footer: { ...d.footer, legal } }))} />
                )}
              </div>
            </Pane>
          </div>
        )}

        {tab === 'pages' && (
          <div className="stack">
            <Pane title={tx('صفحات المتجر', 'Store pages')} description={tx('صفحة جديدة شكلها الأقسام اللي تضيفيها. الصفحات الجاهزة بتاخد أقسام فوق الشغل وتحتيه.', 'A new page’s shape is the sections you add. Fixed pages take sections above and below their working part.')} flush>
              <ul>
                {BUILT_IN_PAGES.map((p) => (
                  <Row
                    key={p.id}
                    title={pick(p.title)}
                    sub={p.to}
                    selected={frameId === p.id}
                    onSelect={() => { setFrameId(p.id); setPageId(undefined) }}
                  />
                ))}
                {draft.pages.map((p, i) => (
                  <Row
                    key={p.id}
                    title={pick(p.title)}
                    sub={`/info/${p.slug}${p.published ? '' : tx(' · مخفية', ' · hidden')}`}
                    on={p.published}
                    onToggle={(published) => edit((d) => ({ ...d, pages: d.pages.map((x) => (x.id === p.id ? { ...x, published } : x)) }))}
                    onUp={() => edit((d) => ({ ...d, pages: move(d.pages, i, -1) }))}
                    onDown={() => edit((d) => ({ ...d, pages: move(d.pages, i, 1) }))}
                    onDelete={() => {
                      const href = `/info/${p.slug}`
                      edit((d) => ({
                        ...d,
                        pages: d.pages.filter((x) => x.id !== p.id),
                        nav: d.nav.filter((n) => n.href !== href),
                        footer: { ...d.footer, columns: d.footer.columns.map((c) => ({ ...c, links: c.links.filter((l) => l.href !== href) })) },
                      }))
                      if (pageId === p.id) setPageId(undefined)
                    }}
                    selected={pageId === p.id}
                    onSelect={() => { setPageId(p.id); setFrameId(undefined) }}
                  />
                ))}
              </ul>
              <div className="pane__foot">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    const text = blankBlock('text')
                    const created: StorePage = {
                      id: uid('pg'),
                      slug: `page-${uid('').slice(0, 4)}`,
                      title: { ar: 'صفحة جديدة', en: 'New page' },
                      body: { ar: '', en: '' },
                      published: true,
                      layout: 'sections',
                      blocks: text.type === 'text' ? [{ ...text, title: { ar: 'عنوان', en: 'Heading' }, body: { ar: 'اكتبي هنا.', en: 'Write here.' } }] : [text],
                    }
                    edit((d) => ({ ...d, pages: [...d.pages, created] }))
                    setPageId(created.id)
                    setFrameId(undefined)
                  }}
                >
                  <Plus size={14} /> {tx('صفحة جديدة', 'New page')}
                </button>
              </div>
            </Pane>
            {frame && (
              <FrameForm
                frame={frame}
                note={pick(BUILT_IN_PAGES.find((p) => p.id === frame.id)!.note)}
                onChange={(next) => edit((d) => ({ ...d, frames: d.frames.map((f) => (f.id === next.id ? next : f)) }))}
              />
            )}
            {page && (
              <PageForm
                page={page}
                inNav={draft.nav.some((n) => n.href === `/info/${page.slug}`)}
                inFooter={draft.footer.columns.some((c) => c.links.some((l) => l.href === `/info/${page.slug}`))}
                onChange={(next, flags) => edit((d) => applyPage(d, page, next, flags))}
              />
            )}
            {!frame && !page && <p className="field__hint">{tx('اختاري صفحة من القائمة.', 'Pick a page from the list.')}</p>}
          </div>
        )}
      </div>
    </>
  )
}

/** While typing: keep a trailing hyphen so "about-us" can be typed. Cleaned on blur and on save. */
function typingSlug(raw: string) {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 48)
}

/** Final, unique slugs before saving, with menu and footer links moved along. */
function finalizeSlugs(d: StorefrontContent): StorefrontContent {
  const used = new Set<string>()
  let out = d
  for (const p of d.pages) {
    let slug = pageSlug(p.slug)
    if (used.has(slug)) slug = pageSlug(`${slug}-${p.id.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase()}`)
    while (used.has(slug)) slug = pageSlug(`${slug}-${uid('').slice(0, 3)}`)
    used.add(slug)
    if (slug === p.slug) continue
    const inNav = out.nav.some((n) => n.href === `/info/${p.slug}`)
    const inFooter = out.footer.columns.some((c) => c.links.some((l) => l.href === `/info/${p.slug}`))
    out = applyPage(out, p, { ...p, slug }, { nav: inNav, footer: inFooter })
  }
  return out
}

function applyPage(d: StorefrontContent, prev: StorePage, next: StorePage, flags: { nav: boolean; footer: boolean }): StorefrontContent {
  if (!next.published) flags = { nav: false, footer: false }
  const from = `/info/${prev.slug}`
  const to = `/info/${next.slug}`
  let nav = d.nav.map((n) => (n.href === from ? { ...n, href: to, label: next.title } : n))
  let columns = d.footer.columns.map((c) => ({
    ...c,
    links: c.links.map((l) => (l.href === from ? { ...l, href: to, label: next.title } : l)),
  }))
  if (flags.nav && !nav.some((n) => n.href === to)) {
    nav = [...nav, { id: uid('n'), label: next.title, href: to, kind: 'link', enabled: true, children: [] }]
  }
  if (!flags.nav) nav = nav.filter((n) => n.href !== to)
  if (flags.footer && !columns.some((c) => c.links.some((l) => l.href === to))) {
    const i = columns.findIndex((c) => c.mode === 'links')
    const link = { id: uid('l'), label: next.title, href: to }
    if (i >= 0) columns = columns.map((c, n) => (n === i ? { ...c, links: [...c.links, link] } : c))
    else columns = [...columns, { id: uid('c'), title: { ar: 'صفحات', en: 'Pages' }, mode: 'links', links: [link], limit: 8 }]
  }
  if (!flags.footer) columns = columns.map((c) => ({ ...c, links: c.links.filter((l) => l.href !== to) }))
  return { ...d, pages: d.pages.map((p) => (p.id === next.id ? next : p)), nav, footer: { ...d.footer, columns } }
}

function PageForm({
  page,
  inNav,
  inFooter,
  onChange,
}: {
  page: StorePage
  inNav: boolean
  inFooter: boolean
  onChange: (page: StorePage, flags: { nav: boolean; footer: boolean }) => void
}) {
  const { tx } = useI18n()
  return (
    <div className="stack">
      <BiFields label={tx('العنوان', 'Title')} value={page.title} onChange={(title) => onChange({ ...page, title }, { nav: inNav, footer: inFooter })} />
      <Field label={tx('الاسم في الرابط', 'URL slug')} hint={`/info/${page.slug}`} htmlFor="sf-page-slug">
        <input
          id="sf-page-slug"
          className="input"
          dir="ltr"
          value={page.slug}
          autoComplete="off"
          onChange={(e) => onChange({ ...page, slug: typingSlug(e.target.value) }, { nav: inNav, footer: inFooter })}
          onBlur={() => page.slug !== pageSlug(page.slug) && onChange({ ...page, slug: pageSlug(page.slug) }, { nav: inNav, footer: inFooter })}
        />
      </Field>
      <Seg
        label={tx('شكل الصفحة', 'Page shape')}
        value={page.layout}
        onChange={(layout) => {
          let blocks = page.blocks
          if (layout === 'sections' && !blocks.length && (page.body.ar.trim() || page.body.en.trim())) {
            const text = blankBlock('text')
            blocks = text.type === 'text' ? [{ ...text, title: page.title, body: page.body }] : [text]
          }
          onChange({ ...page, layout, blocks }, { nav: inNav, footer: inFooter })
        }}
        options={[
          { value: 'sections', label: tx('أقسام', 'Sections') },
          { value: 'article', label: tx('عنوان ونص', 'Title and text') },
        ]}
      />
      {page.layout === 'article' && (
        <BiFields label={tx('النص', 'Text')} area value={page.body} onChange={(body) => onChange({ ...page, body }, { nav: inNav, footer: inFooter })} />
      )}
      <p className="field__hint">
        {page.layout === 'sections'
          ? tx('شكل الصفحة هو الأقسام دي بالترتيب: هيرو، شريط منتجات، نص، روتين…', 'The page’s shape is these sections, in order: hero, product row, text, routine…')
          : tx('عنوان ونص، وبعدين الأقسام اللي تحت.', 'A title and text, then the sections below.')}
      </p>
      <SectionStack blocks={page.blocks} onChange={(blocks) => onChange({ ...page, blocks }, { nav: inNav, footer: inFooter })} />
      {page.published && (
        <Link to={`/info/${page.slug}`} target="_blank">{tx('افتحي الصفحة', 'Open page')}</Link>
      )}
      <label className="row">
        <input type="checkbox" checked={inNav} onChange={(e) => onChange(page, { nav: e.target.checked, footer: inFooter })} />
        {tx('في قائمة المتجر', 'In the store menu')}
      </label>
      <label className="row">
        <input type="checkbox" checked={inFooter} onChange={(e) => onChange(page, { nav: inNav, footer: e.target.checked })} />
        {tx('في الفوتر', 'In the footer')}
      </label>
    </div>
  )
}

function FrameForm({ frame, note, onChange }: { frame: PageFrame; note: string; onChange: (f: PageFrame) => void }) {
  const { tx } = useI18n()
  return (
    <div className="stack">
      <p className="field__hint">{note}</p>
      <h3 className="field__label">{tx('فوق الصفحة', 'Above the page')}</h3>
      <SectionStack blocks={frame.before} onChange={(before) => onChange({ ...frame, before })} />
      <h3 className="field__label">{tx('تحت الصفحة', 'Below the page')}</h3>
      <SectionStack blocks={frame.after} onChange={(after) => onChange({ ...frame, after })} />
    </div>
  )
}

function ColumnForm({ col, onChange }: { col: StoreColumn; onChange: (c: StoreColumn) => void }) {
  const { tx } = useI18n()
  const fid = useId()
  return (
    <div className="stack">
      <BiFields label={tx('العنوان', 'Title')} value={col.title} onChange={(title) => onChange({ ...col, title })} />
      <Field label={tx('المحتوى', 'Contents')} htmlFor={`${fid}-mode`}>
        <select id={`${fid}-mode`} className="select" value={col.mode} onChange={(e) => onChange({ ...col, mode: e.target.value as StoreColumn['mode'] })}>
          <option value="links">{tx('لينكات أنا أكتبها', 'Links I write')}</option>
          <option value="categories">{tx('أقسام المنتجات', 'Product categories')}</option>
          <option value="brands">{tx('الماركات', 'Brands')}</option>
        </select>
      </Field>
      {col.mode !== 'links' && (
        <Field label={tx('العدد', 'How many')} htmlFor={`${fid}-limit`}>
          <input id={`${fid}-limit`} className="input" dir="ltr" type="number" min={1} max={20} value={col.limit} onChange={(e) => onChange({ ...col, limit: Number(e.target.value) })} />
        </Field>
      )}
      {col.mode === 'links' && <LinksEditor links={col.links} onChange={(links) => onChange({ ...col, links })} />}
    </div>
  )
}
