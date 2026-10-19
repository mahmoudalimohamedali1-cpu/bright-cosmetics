import type { Bi } from '../i18n'
import type { CategoryDef, Product, Settings } from './types'
import { CATEGORY_LABEL } from './catalog'

/*
  Product categories. The owner manages them in Admin > Storefront > Categories
  (add, rename, reorder, hide). Older saves have no list: the built-in eleven
  apply. A category's id is its URL (/shop/<id>) and what products store, so it
  never changes after creation; the label is free to change.
*/

const BUILT_IN: { id: string; skincare: boolean }[] = [
  { id: 'cleanser', skincare: true },
  { id: 'toner', skincare: true },
  { id: 'essence', skincare: true },
  { id: 'serum', skincare: true },
  { id: 'eye', skincare: true },
  { id: 'mask', skincare: true },
  { id: 'moisturizer', skincare: true },
  { id: 'sunscreen', skincare: true },
  { id: 'hair', skincare: false },
  { id: 'makeup', skincare: false },
  { id: 'lip', skincare: false },
]

export function defaultCategories(): CategoryDef[] {
  return BUILT_IN.map((c) => ({ id: c.id, label: { ...CATEGORY_LABEL[c.id as keyof typeof CATEGORY_LABEL] }, enabled: true, skincare: c.skincare }))
}

/** URL-safe id from what the owner typed: lowercase latin letters, digits and hyphens. */
export function categoryId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.replace(/\0/g, '').trim().slice(0, n) : '')

/** Drop anything malformed; ids unique; never empty (falls back to the built-ins). */
export function sanitizeCategories(raw: unknown): CategoryDef[] {
  if (!Array.isArray(raw)) return defaultCategories()
  const seen = new Set<string>()
  const out: CategoryDef[] = []
  for (const v of raw.slice(0, 60)) {
    if (!v || typeof v !== 'object') continue
    const o = v as Partial<CategoryDef>
    const id = categoryId(typeof o.id === 'string' ? o.id : '')
    if (!id || seen.has(id)) continue
    const l = (o.label && typeof o.label === 'object' ? o.label : {}) as Partial<Bi>
    const label = { ar: clip(l.ar, 60), en: clip(l.en, 60) }
    if (!label.ar && !label.en) continue
    seen.add(id)
    out.push({ id, label, enabled: o.enabled !== false, skincare: o.skincare !== false })
  }
  return out.length ? out : defaultCategories()
}

export function resolveCategories(settings: Pick<Settings, 'categories'>): CategoryDef[] {
  return settings.categories ? sanitizeCategories(settings.categories) : defaultCategories()
}

/** Label for any id, including one a product still carries after its category was removed. */
export function categoryLabel(list: CategoryDef[], id: string): Bi {
  const c = list.find((x) => x.id === id)
  if (c) return { ar: c.label.ar || c.label.en, en: c.label.en || c.label.ar }
  const builtIn = CATEGORY_LABEL[id as keyof typeof CATEGORY_LABEL]
  return builtIn ?? { ar: id, en: id }
}

/** What shoppers see in menus, chips and the footer: enabled, in the owner's order, with at least one product on sale. */
export function shownCategories(list: CategoryDef[], products: Product[]): CategoryDef[] {
  return list.filter((c) => c.enabled && products.some((p) => p.category === c.id))
}
