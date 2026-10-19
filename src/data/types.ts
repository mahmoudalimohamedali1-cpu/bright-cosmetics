import type { Bi } from '../i18n'

export type Origin = 'KR' | 'FR' | 'US' | 'JP' | 'CA' | 'DE' | 'EG' | 'CN'

/** The eleven categories the store started with. */
export type BuiltInCategory =
  | 'cleanser'
  | 'toner'
  | 'essence'
  | 'serum'
  | 'moisturizer'
  | 'sunscreen'
  | 'mask'
  | 'makeup'
  | 'lip'
  | 'eye'
  | 'hair'

/** A category id: a built-in one, or one the owner added in Admin > Storefront > Categories. */
export type Category = string

export type CategoryDef = {
  /** URL part and what products store; fixed once created */
  id: string
  label: Bi
  /** Hidden categories stay on their products but leave menus, chips and the footer */
  enabled: boolean
  /** Part of the skin routine finder (hair, makeup and lips are not) */
  skincare: boolean
}

export type SkinType = 'oily' | 'dry' | 'combination' | 'sensitive' | 'normal'
export type Concern = 'acne' | 'hydration' | 'brightening' | 'aging' | 'pores' | 'redness' | 'sun' | 'barrier'

/** Container drawn by <ProductVisual/> */
export type Shape = 'dropper' | 'pump' | 'jar' | 'tube' | 'toner' | 'mask' | 'cushion' | 'tint' | 'pad'

export type Visual = {
  shape: Shape
  body: string // container ink
  cap: string // cap / pump ink
  label: string // label panel ink
  text: string // label text ink
}

export type Batch = {
  id: string
  lot: string
  qty: number
  expiry: string // ISO date
  receivedAt: string // ISO date
  shipmentId: string
}

export type ProductStatus = 'active' | 'draft' | 'archived'

export type Product = {
  id: string
  slug: string
  sku: string
  barcode: string
  brand: string
  origin: Origin
  name: Bi
  short: Bi
  description: Bi
  howToUse: Bi
  category: Category
  /** 1 cleanse · 2 tone · 3 treat (essence/serum) · 4 mask · 5 moisturize · 6 protect */
  routineStep: 1 | 2 | 3 | 4 | 5 | 6
  routineTime: ('am' | 'pm')[]
  skinTypes: SkinType[]
  concerns: Concern[]
  ingredients: Bi[]
  size: string
  price: number
  compareAt?: number
  /** false = estimated price the owner still has to confirm */
  priceConfirmed?: boolean
  /** Landed unit cost in EGP (purchase + freight + customs) */
  cost: number
  batches: Batch[]
  lowStockAt: number
  visual: Visual
  /** Real packshot (transparent WebP under /public/products). Falls back to the drawn visual. */
  image?: string
  /** Extra images for the product page gallery */
  gallery?: string[]
  rating: number
  reviewCount: number
  tags: string[]
  status: ProductStatus
  createdAt: string
  /** Units sold in last 30 days — seeded, then derived from orders */
  featured?: boolean
}

export type Governorate = {
  id: string
  name: Bi
  zone: 'cairo' | 'delta' | 'canal' | 'upper' | 'remote'
}

export type ShippingZone = {
  id: 'cairo' | 'delta' | 'canal' | 'upper' | 'remote'
  name: Bi
  rate: number
  freeOver: number
  etaDays: [number, number]
  codFee: number
  enabled: boolean
}

export type Customer = {
  id: string
  name: Bi
  email: string
  phone: string
  governorateId: string
  skinType: SkinType
  concerns: Concern[]
  createdAt: string
  tags: string[]
  acceptsMarketing: boolean
  note?: string
}

export type PaymentMethod = 'cod' | 'card' | 'wallet' | 'instapay'
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'partially_refunded'
export type FulfillmentStatus = 'unfulfilled' | 'packed' | 'shipped' | 'delivered' | 'returned'
export type OrderStatus = 'open' | 'confirmed' | 'cancelled' | 'archived'

export type OrderLine = {
  productId: string
  qty: number
  price: number
  cost: number
  /** First lot the units came from */
  batchId?: string
  /** Every lot, when the units came from more than one */
  picks?: { batchId: string; qty: number }[]
}

export type OrderEvent = {
  at: string
  type:
    | 'placed'
    | 'confirmed'
    | 'whatsapp_confirmed'
    | 'paid'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned'
    | 'refunded'
    | 'note'
  note?: string
  by?: string
}

export type Channel = 'web' | 'instagram' | 'tiktok' | 'whatsapp' | 'pos'

export type Order = {
  id: string
  number: number
  customerId: string
  createdAt: string
  lines: OrderLine[]
  subtotal: number
  discount: number
  discountCode?: string
  shipping: number
  codFee: number
  total: number
  payment: PaymentMethod
  paymentStatus: PaymentStatus
  fulfillment: FulfillmentStatus
  status: OrderStatus
  governorateId: string
  address: string
  channel: Channel
  tracking?: string
  courier?: 'Bosta' | 'Aramex' | 'J&T' | 'Mylerz'
  events: OrderEvent[]
  note?: string
  tags: string[]
  risk: 'low' | 'medium' | 'high'
}

export type Review = {
  id: string
  productId: string
  customerId: string
  rating: number
  title: string
  body: string
  lang: 'ar' | 'en'
  createdAt: string
  status: 'published' | 'pending' | 'hidden'
  skinType: SkinType
  verified: boolean
  reply?: string
}

export type DiscountKind = 'percent' | 'fixed' | 'free_shipping' | 'bogo' | 'bundle'

export type Discount = {
  id: string
  code: string
  title: Bi
  kind: DiscountKind
  value: number
  minSubtotal: number
  usageLimit?: number
  used: number
  startsAt: string
  endsAt?: string
  active: boolean
  automatic: boolean
  appliesTo: 'all' | 'category' | 'brand' | 'products'
  target?: string[]
}

export type CartLine = { productId: string; qty: number }

export type AbandonedCart = {
  id: string
  customerId?: string
  phone?: string
  createdAt: string
  lines: CartLine[]
  total: number
  stage: 'cart' | 'checkout_info' | 'checkout_shipping' | 'checkout_payment'
  recovered: boolean
  remindersSent: number
}

export type Shipment = {
  id: string
  supplier: string
  origin: Origin
  createdAt: string
  arrivedAt?: string
  status: 'ordered' | 'in_transit' | 'customs' | 'received'
  freight: number
  customs: number
  lines: { productId: string; qty: number; unitCost: number }[]
}

export type Staff = {
  id: string
  name: string
  email: string
  role: 'owner' | 'manager' | 'fulfillment' | 'support' | 'marketing'
  lastActive: string
}

export type Activity = {
  id: string
  at: string
  who: string
  what: Bi
  link?: string
}

export type StoreLink = { id: string; label: Bi; href: string }

export type StoreNavKind = 'link' | 'categories' | 'brands'

export type StoreNavItem = {
  id: string
  label: Bi
  href: string
  kind: StoreNavKind
  enabled: boolean
  /** Extra links inside a categories mega menu */
  children: StoreLink[]
}

export type StoreColumn = {
  id: string
  title: Bi
  mode: 'links' | 'categories' | 'brands'
  links: StoreLink[]
  limit: number
}

export type StorePage = {
  id: string
  slug: string
  title: Bi
  body: Bi
  published: boolean
  /** sections = the page is the blocks. article = a title and text, then blocks. */
  layout: 'sections' | 'article'
  blocks: HomeBlock[]
}

export type RailSource = 'manual' | 'best' | 'offers' | 'new' | 'brand' | 'category'

/** Visual layouts a shaped section can take. The owner picks one per section, and can add many. */
export type PanelShape =
  | 'banner'
  | 'poster'
  | 'statement'
  | 'editorial'
  | 'split'
  | 'split-flip'
  | 'feature'
  | 'duo'
  | 'mosaic'
  | 'shelf'
  | 'columns'
  | 'list'
  | 'steps'
  | 'claims'
  | 'quote'
  | 'cta'

export type HomeBlock =
  | { id: string; type: 'hero'; enabled: boolean; headline: Bi; sub: Bi; cta: Bi; href: string; slugs: string[] }
  | { id: string; type: 'bestsellers'; enabled: boolean; title: Bi; cta: Bi; href: string; limit: number; slugs: string[] }
  | {
      id: string
      type: 'rail'
      enabled: boolean
      title: Bi
      sub: Bi
      cta: Bi
      href: string
      tone: 'plain' | 'blush'
      source: RailSource
      slugs: string[]
      brand: string
      category: string
      limit: number
    }
  | { id: string; type: 'categories'; enabled: boolean; title: Bi; sub: Bi }
  | { id: string; type: 'promises'; enabled: boolean; title: Bi; slugs: string[]; items: { id: string; title: Bi; body: Bi }[] }
  | { id: string; type: 'quotes'; enabled: boolean }
  | { id: string; type: 'marquee'; enabled: boolean; text: Bi; label: Bi }
  | { id: string; type: 'spin'; enabled: boolean; slug: string }
  | { id: string; type: 'lot'; enabled: boolean; title: Bi; body: Bi; cta: Bi; href: string; slug: string }
  | { id: string; type: 'routines'; enabled: boolean; title: Bi; cards: { id: string; title: Bi; href: string; badge: Bi; skin: string; concern: string }[] }
  | { id: string; type: 'brands'; enabled: boolean; title: Bi; sub: Bi }
  | { id: string; type: 'text'; enabled: boolean; title: Bi; body: Bi; cta: Bi; href: string }
  | {
      id: string
      type: 'panel'
      enabled: boolean
      shape: PanelShape
      title: Bi
      sub: Bi
      body: Bi
      cta: Bi
      href: string
      slugs: string[]
      items: { id: string; title: Bi; body: Bi }[]
    }

/** Fixed store pages. Their working part stays; sections can sit above and below it. */
export type BuiltInPage = 'shop' | 'routine' | 'account' | 'wishlist' | 'product' | 'checkout' | 'missing'

export type PageFrame = {
  id: BuiltInPage
  before: HomeBlock[]
  after: HomeBlock[]
}

/** Everything the shopper sees that is not a product, order, or review record. */
export type StorefrontContent = {
  seoTitle: Bi
  seoDescription: Bi
  slogan: Bi
  ticker: Bi[]
  nav: StoreNavItem[]
  blocks: HomeBlock[]
  footer: {
    clubTitle: Bi
    clubNote: Bi
    clubOk: Bi
    columns: StoreColumn[]
    legalMode: 'auto' | 'custom'
    legal: Bi
  }
  pages: StorePage[]
  /** Extra sections on the fixed pages (shop, checkout, and the rest). */
  frames: PageFrame[]
}

export type Settings = {
  storeName: Bi
  email: string
  phone: string
  whatsapp: string
  currency: 'EGP'
  taxIncluded: boolean
  vatRate: number
  lowStockDefault: number
  expiryWarnDays: number
  codEnabled: boolean
  codMax: number
  autoConfirmWhatsapp: boolean
  defaultLang: 'ar' | 'en'
  announcement: Bi
  /** Absent on older saves: the storefront falls back to the built-in copy. */
  storefront?: StorefrontContent
  /** Absent on older saves: the built-in eleven categories apply. */
  categories?: CategoryDef[]
}
