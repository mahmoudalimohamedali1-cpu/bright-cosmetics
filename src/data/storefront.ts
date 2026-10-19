import type { Bi } from '../i18n'
import type {
  Concern,
  HomeBlock,
  Product,
  RailSource,
  Settings,
  SkinType,
  StoreColumn,
  StorefrontContent,
  StoreLink,
  StoreNavItem,
  StoreNavKind,
  BuiltInPage,
  PageFrame,
  PanelShape,
  StorePage,
} from './types'
import { uid } from '../lib/rand'

/*
  Storefront copy and layout. The shop renders `resolveStorefront(settings)`.
  Older databases have no `settings.storefront`; they keep the built-in page
  until someone saves from Admin → Storefront. `mailto:store` and
  `whatsapp:store` stay pointed at the live store email and WhatsApp.
*/

const b = (ar: string, en: string): Bi => ({ ar, en })

const SKINS = new Set<SkinType>(['oily', 'dry', 'combination', 'sensitive', 'normal'])
const CONCERNS = new Set<Concern>(['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness', 'sun', 'barrier'])
const SOURCES = new Set<RailSource>(['manual', 'best', 'offers', 'new', 'brand', 'category'])
const KINDS = new Set<StoreNavKind>(['link', 'categories', 'brands'])

export const BLOCK_LABEL: Record<HomeBlock['type'], Bi> = {
  hero: b('الهيرو', 'Hero'),
  bestsellers: b('الأكثر مبيعًا', 'Bestsellers'),
  rail: b('شريط منتجات', 'Product row'),
  categories: b('الأقسام', 'Categories'),
  promises: b('ليه برايت', 'Why Bright'),
  quotes: b('آراء العميلات', 'Reviews'),
  marquee: b('جملة متحركة', 'Marquee'),
  spin: b('الشريط الدوار', 'Spin band'),
  lot: b('سجل التشغيلة', 'Lot record'),
  routines: b('روتينات', 'Routines'),
  brands: b('الماركات', 'Brands'),
  text: b('نص', 'Text'),
  panel: b('قسم بشكل', 'Shaped section'),
}

export const PANEL_SHAPES: { id: PanelShape; ar: string; en: string }[] = [
  { id: 'banner', ar: 'بانر عريض', en: 'Wide banner' },
  { id: 'poster', ar: 'بوستر غامق', en: 'Ink poster' },
  { id: 'statement', ar: 'جملة كبيرة', en: 'Big line' },
  { id: 'editorial', ar: 'افتتاحية', en: 'Editorial' },
  { id: 'split', ar: 'نص وعبوات', en: 'Copy and bottles' },
  { id: 'split-flip', ar: 'عبوات ونص', en: 'Bottles and copy' },
  { id: 'feature', ar: 'منتج واحد', en: 'One product' },
  { id: 'duo', ar: 'منتجين', en: 'Two products' },
  { id: 'mosaic', ar: 'فسيفساء', en: 'Mosaic' },
  { id: 'shelf', ar: 'رف', en: 'Shelf' },
  { id: 'columns', ar: 'ثلاثة أعمدة', en: 'Three columns' },
  { id: 'list', ar: 'قائمة', en: 'List' },
  { id: 'steps', ar: 'خطوات', en: 'Steps' },
  { id: 'claims', ar: 'وعود قصيرة', en: 'Short claims' },
  { id: 'quote', ar: 'اقتباس', en: 'Quote' },
  { id: 'cta', ar: 'دعوة', en: 'Call to shop' },
]

export const SHAPE_FIELDS: Record<PanelShape, Array<'title' | 'sub' | 'body' | 'cta' | 'slugs' | 'items'>> = {
  banner: ['title', 'sub', 'cta'],
  poster: ['title', 'sub', 'cta'],
  statement: ['title'],
  editorial: ['title', 'body'],
  split: ['title', 'body', 'cta', 'slugs'],
  'split-flip': ['title', 'body', 'cta', 'slugs'],
  feature: ['title', 'body', 'cta', 'slugs'],
  duo: ['title', 'slugs'],
  mosaic: ['title', 'slugs'],
  shelf: ['title', 'sub', 'cta', 'slugs'],
  columns: ['title', 'items'],
  list: ['title', 'items'],
  steps: ['title', 'items'],
  claims: ['items'],
  quote: ['body', 'title'],
  cta: ['title', 'sub', 'cta'],
}

const PANEL_SHAPE_IDS = new Set<PanelShape>(PANEL_SHAPES.map((s) => s.id))

const HERO_SLUGS = [
  'the-ordinary-niacinamide-10-zinc-1',
  'anua-niacinamide-10-txa-4-serum',
  'dr-althea-345-relief-cream',
  'eqqualberry-lush-blush-nad-peptide-boosting-serum',
  'arencia-fresh-rosehip-rice-mochi-cleanser',
]

const WHY_SLUGS = [
  'the-ordinary-caffeine-solution-5-egcg',
  'the-ordinary-soothing-barrier-support-serum',
  'the-ordinary-retinol-0-2-in-squalane',
]

export function defaultStorefront(): StorefrontContent {
  return {
    seoTitle: b('برايت كوزمتكس', 'Bright Cosmetics'),
    seoDescription: b(
      'برايت — منتجات تجميل كورية ومستوردة أصلية، مختارة حسب نوع بشرتك.',
      'Bright — authentic Korean and imported beauty, matched to your skin.',
    ),
    slogan: b('بشرتك، بس أحلى.', 'Your skin, only brighter.'),
    ticker: [
      b('أصلي 100%', '100% authentic'),
      b('الدفع عند الاستلام', 'Cash on delivery'),
      b('رقم التشغيلة على كل عبوة', 'Lot number on every unit'),
      b('مختار لنوع بشرتك', 'Matched to your skin'),
    ],
    nav: [
      { id: 'nav-home', label: b('الرئيسية', 'Home'), href: '/', kind: 'link', enabled: true, children: [] },
      { id: 'nav-cat', label: b('المنتجات', 'Products'), href: '/shop', kind: 'categories', enabled: true, children: [
        { id: 'nav-kr', label: b('كوري', 'K-beauty'), href: '/shop?origin=KR' },
        { id: 'nav-imp', label: b('مستورد', 'Imported'), href: '/shop?origin=FR,US,JP,CA,DE,CN' },
      ] },
      { id: 'nav-brand', label: b('الماركات', 'Brands'), href: '/shop', kind: 'brands', enabled: true, children: [] },
      { id: 'nav-quiz', label: b('اعرفي بشرتك', 'Skin quiz'), href: '/routine', kind: 'link', enabled: true, children: [] },
    ],
    blocks: [
      {
        id: 'hero',
        type: 'hero',
        enabled: true,
        headline: b('بشرتك، بس أحلى.', 'Your skin, only brighter.'),
        sub: b('سكين كير كوري ومستورد أصلي، متختار على قد بشرتك.', 'Authentic Korean & imported skincare, matched to your skin.'),
        cta: b('تسوقي دلوقتي', 'Shop now'),
        href: '/shop',
        slugs: [...HERO_SLUGS],
      },
      {
        id: 'best',
        type: 'bestsellers',
        enabled: true,
        title: b('الأكتر مبيعًا عندنا، وكل عبوة برقم تشغيلتها.', 'Our bestsellers, every bottle with its lot number.'),
        cta: b('شوفي الكل', 'See all'),
        href: '/shop?sort=best',
        limit: 8,
        slugs: [],
      },
      {
        id: 'offers',
        type: 'rail',
        enabled: true,
        title: b('عروض برايت.', 'Bright offers.'),
        sub: b('نفس الجودة الأصلية، بسعر أحسن لفترة محدودة.', 'The same authentic quality, at a better price for a while.'),
        cta: b('شوفي الكل', 'See all'),
        href: '/shop?sort=price-asc',
        tone: 'blush',
        source: 'offers',
        slugs: [],
        brand: '',
        category: '',
        limit: 24,
      },
      {
        id: 'cats',
        type: 'categories',
        enabled: true,
        title: b('تسوقي حسب القسم.', 'Shop by category.'),
        sub: b('اختاري الخطوة اللي ناقصة روتينك.', 'Pick the step your routine is missing.'),
      },
      {
        id: 'why',
        type: 'promises',
        enabled: true,
        title: b('كل اللي محتاجاه بشرتك. ولا حاجة زيادة.', "Everything your skin wants. Nothing it doesn't."),
        slugs: [...WHY_SLUGS],
        items: [
          {
            id: 'pr-lot',
            title: b('تشغيلة أصلية، مكتوبة على كل عبوة', 'Authentic lots, on every unit'),
            body: b(
              'كل عبوة عليها رقم التشغيلة وتاريخ الانتهاء، وتقدري تشوفيهم في صفحة المنتج قبل ما تطلبي. وبنشحن الأقرب في الانتهاء الأول، عشان مفيش حاجة تقعد على الرف.',
              'Every unit carries its lot number and expiry, and you can see both on the product page before you order. We ship the earliest-expiring lot first, so nothing sits on a shelf.',
            ),
          },
          {
            id: 'pr-skin',
            title: b('على قد بشرتك', 'Matched to your skin'),
            body: b(
              'فلتري بنوع بشرتك واللي مضايقك: حبوب، جفاف، بقع، مسام. ولو مش متأكدة، اختبار الروتين في أربع أسئلة بيرشّحلك منتج لكل خطوة.',
              'Filter by skin type and concern: breakouts, dryness, dark spots, pores. Not sure? The four-question routine quiz picks one product for every step.',
            ),
          },
          {
            id: 'pr-cod',
            title: b('الدفع عند الاستلام في كل مصر', 'Cash on delivery across Egypt'),
            body: b(
              'بنأكّد الطلب معاكي على واتساب، وبيوصلك مع شركة شحن لحد الباب في كل المحافظات. تفتحي وتتأكدي وبعدين تدفعي.',
              'We confirm your order on WhatsApp, then a courier brings it to your door in every governorate. Check it, then pay.',
            ),
          },
          {
            id: 'pr-mix',
            title: b('كوري ومستورد، في مكان واحد', 'Korean + imported'),
            body: b(
              'أشهر ماركات الكي بيوتي جنب ماركات الصيدليات الفرنساوي، من موزّعين معتمدين بس.',
              'Cult K-beauty next to French pharmacy staples, only ever from authorised suppliers.',
            ),
          },
        ],
      },
      { id: 'quotes', type: 'quotes', enabled: true },
      {
        id: 'marquee',
        type: 'marquee',
        enabled: true,
        text: b('أصلي، مش تقليد', 'Authentic, never knock-off'),
        label: b('وعد برايت', 'The Bright promise'),
      },
      { id: 'spin', type: 'spin', enabled: true, slug: '' },
      {
        id: 'ordinary',
        type: 'rail',
        enabled: true,
        title: b('عالم The Ordinary.', 'The Ordinary edit.'),
        sub: b('تركيبات علمية بسيطة، كل واحدة لهدف واحد.', 'Simple, science-led formulas, each for one job.'),
        cta: b('شوفي الكل', 'See all'),
        href: '/brand/the-ordinary',
        tone: 'plain',
        source: 'brand',
        slugs: [],
        brand: 'The Ordinary',
        category: '',
        limit: 12,
      },
      {
        id: 'lot',
        type: 'lot',
        enabled: true,
        title: b('كل عبوة ليها سجل: من برايت لحد باب بيتك.', 'Every unit has a record: from Bright to your door.'),
        body: b(
          'جاية منين، وصلت إمتى، وصالحة لحد إمتى. السجل ده موجود في صفحة كل منتج، قبل ما تدفعي جنيه.',
          'Where it came from, when it landed, how long it is good for. The record sits on every product page, before you pay a pound.',
        ),
        cta: b('اعرفي أكتر', 'See a record'),
        href: '',
        slug: '',
      },
      {
        id: 'routines',
        type: 'routines',
        enabled: true,
        title: b('روتينات.', 'Routines.'),
        cards: [
          { id: 'rt-calm', title: b('روتين البشرة الحساسة', 'Calm routine'), href: '/shop?skin=sensitive', badge: b('جديد', 'New'), skin: 'sensitive', concern: 'redness' },
          { id: 'rt-glow', title: b('روتين التوهّج', 'Glow routine'), href: '/shop?concern=brightening', badge: b('', ''), skin: '', concern: 'brightening' },
          { id: 'rt-clear', title: b('روتين الحبوب', 'Clear routine'), href: '/shop?concern=acne', badge: b('', ''), skin: '', concern: 'acne' },
        ],
      },
      {
        id: 'fresh',
        type: 'rail',
        enabled: true,
        title: b('وصل حديثًا.', 'Just in.'),
        sub: b('آخر اللي نزل على رفوف برايت.', 'The latest on Bright’s shelves.'),
        cta: b('شوفي الكل', 'See all'),
        href: '/shop?sort=new',
        tone: 'blush',
        source: 'new',
        slugs: [],
        brand: '',
        category: '',
        limit: 10,
      },
      {
        id: 'brands',
        type: 'brands',
        enabled: true,
        title: b('تسوقي بالماركة.', 'Shop by brand.'),
        sub: b('ماركات كورية ومستوردة أصلية، وكل عبوة عليها رقم تشغيلتها.', 'Authentic Korean and imported brands, every unit with its lot number.'),
      },
    ],
    footer: {
      clubTitle: b('انضمي لنادي برايت.', 'Join the Bright club.'),
      clubNote: b('عروض وأول المنتجات الجديدة. من غير زحمة.', 'Offers and first look at new drops. No spam.'),
      clubOk: b('اتسجّلتي. هنبعتلك أول عرض.', "You're in. First offer is on its way."),
      legalMode: 'auto',
      legal: b(
        'الدفع عند الاستلام في كل المحافظات.',
        'Cash on delivery in every governorate.',
      ),
      columns: [
        { id: 'ft-shop', title: b('تسوّقي', 'Shop'), mode: 'categories', links: [], limit: 6 },
        { id: 'ft-brands', title: b('الماركات', 'Brands'), mode: 'brands', links: [], limit: 7 },
        {
          id: 'ft-help',
          title: b('مساعدة', 'Help'),
          mode: 'links',
          limit: 8,
          links: [
            { id: 'ft-ship', label: b('الشحن والدفع', 'Shipping'), href: '#v-ship' },
            { id: 'ft-ret', label: b('الاسترجاع', 'Returns'), href: 'mailto:store' },
            { id: 'ft-wa', label: b('كلّمينا واتساب', 'Contact'), href: 'whatsapp:store' },
            { id: 'ft-track', label: b('تتبّعي طلبك', 'Track your order'), href: '/account' },
            { id: 'ft-quiz', label: b('اعرفي بشرتك', 'Skin quiz'), href: '/routine' },
            { id: 'ft-admin', label: b('لوحة التحكم', 'Admin'), href: '/admin' },
          ],
        },
      ],
    },
    pages: [],
    frames: emptyFrames(),
  }
}

export const BUILT_IN_PAGES: { id: BuiltInPage; title: Bi; to: string; note: Bi }[] = [
  { id: 'shop', title: b('المتجر', 'Shop'), to: '/shop', note: b('الفلاتر وشبكة المنتجات بتفضل. الأقسام بتتحط فوقها أو تحتها.', 'Filters and the product grid stay. Sections sit above or below them.') },
  { id: 'routine', title: b('الروتين', 'Routine quiz'), to: '/routine', note: b('الأسئلة والنتيجة بتفضل. الأقسام بتتحط فوقها أو تحتها.', 'The questions and result stay. Sections sit above or below them.') },
  { id: 'account', title: b('حسابي', 'Account'), to: '/account', note: b('متابعة الطلب بتفضل. الأقسام بتتحط فوقها أو تحتها.', 'Order tracking stays. Sections sit above or below it.') },
  { id: 'wishlist', title: b('المفضلة', 'Wishlist'), to: '/wishlist', note: b('قائمة المفضلة بتفضل. الأقسام بتتحط فوقها أو تحتها.', 'The saved list stays. Sections sit above or below it.') },
  { id: 'product', title: b('صفحة المنتج', 'Product page'), to: '/shop', note: b('بتظهر على كل صفحة منتج. بيانات المنتج نفسه بتتعدل من صفحة المنتجات.', 'Shown on every product page. The product itself is edited on the Products page.') },
  { id: 'checkout', title: b('إتمام الطلب', 'Checkout'), to: '/checkout', note: b('فورم الدفع بتفضل. الأقسام بتتحط فوقها أو تحتها.', 'The checkout form stays. Sections sit above or below it.') },
  { id: 'missing', title: b('صفحة مش موجودة', 'Missing page'), to: '/info/missing-preview', note: b('بتظهر لما حد يفتح لينك مش موجود.', 'Shown when someone opens a link that does not exist.') },
]

export function emptyFrames(): PageFrame[] {
  return BUILT_IN_PAGES.map((p) => ({ id: p.id, before: [], after: [] }))
}

/** A new block the admin can drop onto the homepage. */
export function blankBlock(type: HomeBlock['type']): HomeBlock {
  const id = uid('b')
  const empty = b('', '')
  switch (type) {
    case 'hero':
      return { id, type, enabled: true, headline: b('عنوان جديد', 'New headline'), sub: empty, cta: b('تسوقي', 'Shop'), href: '/shop', slugs: [] }
    case 'bestsellers':
      return { id, type, enabled: true, title: b('الأكثر مبيعًا', 'Bestsellers'), cta: b('شوفي الكل', 'See all'), href: '/shop?sort=best', limit: 8, slugs: [] }
    case 'rail':
      return { id, type, enabled: true, title: b('قسم جديد', 'New row'), sub: empty, cta: b('شوفي الكل', 'See all'), href: '/shop', tone: 'plain', source: 'manual', slugs: [], brand: '', category: '', limit: 8 }
    case 'categories':
      return { id, type, enabled: true, title: b('تسوقي حسب القسم.', 'Shop by category.'), sub: empty }
    case 'promises':
      return { id, type, enabled: true, title: b('عنوان', 'Heading'), slugs: [], items: [{ id: uid('p'), title: b('وعد', 'Promise'), body: b('التفصيلة', 'The detail') }] }
    case 'quotes':
      return { id, type, enabled: true }
    case 'marquee':
      return { id, type, enabled: true, text: b('جملة', 'A line'), label: b('شريط', 'Strip') }
    case 'spin':
      return { id, type, enabled: true, slug: '' }
    case 'lot':
      return { id, type, enabled: true, title: b('سجل التشغيلة', 'Lot record'), body: empty, cta: b('اعرفي أكتر', 'See a record'), href: '', slug: '' }
    case 'routines':
      return { id, type, enabled: true, title: b('روتينات.', 'Routines.'), cards: [{ id: uid('r'), title: b('روتين', 'Routine'), href: '/shop', badge: empty, skin: '', concern: '' }] }
    case 'brands':
      return { id, type, enabled: true, title: b('تسوقي بالماركة.', 'Shop by brand.'), sub: empty }
    case 'text':
      return { id, type, enabled: true, title: b('عنوان', 'Heading'), body: b('اكتبي هنا.', 'Write here.'), cta: empty, href: '' }
    case 'panel':
      return blankPanel('banner')
  }
}

export function blankPanel(shape: PanelShape): Extract<HomeBlock, { type: 'panel' }> {
  const needsItems = shape === 'columns' || shape === 'list' || shape === 'steps' || shape === 'claims'
  return {
    id: uid('b'),
    type: 'panel',
    enabled: true,
    shape,
    title: b('عنوان القسم', 'Section heading'),
    sub: b('سطر قصير تحت العنوان.', 'A short line under the heading.'),
    body: b('اكتبي هنا.', 'Write here.'),
    cta: b('تسوقي', 'Shop'),
    href: '/shop',
    slugs: [],
    items: needsItems
      ? [1, 2, 3].map(() => ({ id: uid('i'), title: b('سطر', 'Line'), body: b('تفصيلة قصيرة.', 'A short detail.') }))
      : [],
  }
}

function clip(v: unknown, n: number) {
  return typeof v === 'string' ? v.replace(/\0/g, '').slice(0, n) : ''
}

function bi(v: unknown, n = 500): Bi {
  const o = v && typeof v === 'object' ? (v as { ar?: unknown; en?: unknown }) : {}
  return { ar: clip(o.ar, n), en: clip(o.en, n) }
}

function sid(v: unknown, prefix: string) {
  const s = typeof v === 'string' ? v.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) : ''
  return s || uid(prefix)
}

export function safeHref(href: string): string {
  const h = href.trim()
  if (h === 'mailto:store' || h === 'whatsapp:store') return h
  if (h.startsWith('#') && /^#[A-Za-z0-9_-]+$/.test(h)) return h
  if (h.startsWith('/') && !h.startsWith('//') && !h.includes('\\') && !h.includes(' ')) return h.slice(0, 240)
  if (/^https?:\/\/[^\s]+$/i.test(h)) return h.slice(0, 400)
  if (/^mailto:[^\s]+$/i.test(h)) return h.slice(0, 200)
  if (/^tel:\+?[0-9]{6,16}$/.test(h)) return h
  return '/'
}

export function resolveHref(href: string, settings: Pick<Settings, 'email' | 'whatsapp'>): string {
  if (href === 'mailto:store') return `mailto:${settings.email}`
  if (href === 'whatsapp:store') return `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}`
  return safeHref(href)
}

function link(v: unknown): StoreLink {
  const o = v && typeof v === 'object' ? (v as { id?: unknown; label?: unknown; href?: unknown }) : {}
  return { id: sid(o.id, 'l'), label: bi(o.label, 80), href: safeHref(clip(o.href, 400)) }
}

function navItem(v: unknown): StoreNavItem {
  const o = v && typeof v === 'object' ? (v as Partial<StoreNavItem>) : {}
  const kind = KINDS.has(o.kind as StoreNavKind) ? (o.kind as StoreNavKind) : 'link'
  return {
    id: sid(o.id, 'n'),
    label: bi(o.label, 60),
    href: safeHref(clip(o.href, 240)),
    kind,
    enabled: o.enabled !== false,
    children: Array.isArray(o.children) ? o.children.slice(0, 16).map(link) : [],
  }
}

function column(v: unknown): StoreColumn {
  const o = v && typeof v === 'object' ? (v as Partial<StoreColumn>) : {}
  const mode = o.mode === 'categories' || o.mode === 'brands' || o.mode === 'links' ? o.mode : 'links'
  const limit = Math.min(20, Math.max(0, Math.round(Number(o.limit) || 6)))
  return {
    id: sid(o.id, 'c'),
    title: bi(o.title, 60),
    mode,
    links: Array.isArray(o.links) ? o.links.slice(0, 30).map(link) : [],
    limit,
  }
}

export function pageSlug(raw: string) {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return s || 'page'
}

function page(v: unknown, used: Set<string>): StorePage | null {
  const o = v && typeof v === 'object' ? (v as Partial<StorePage>) : {}
  const title = bi(o.title, 120)
  const body = bi(o.body, 8000)
  const blocks = blocksOf(o.blocks)
  if (!title.ar.trim() && !title.en.trim() && !body.ar.trim() && !body.en.trim() && !blocks.length) return null
  let slug = pageSlug(clip(o.slug, 60))
  if (used.has(slug)) slug = pageSlug(`${slug}-${sid(o.id, 'p').slice(0, 4)}`)
  used.add(slug)
  const layout = o.layout === 'sections' || o.layout === 'article' ? o.layout : blocks.length ? 'sections' : 'article'
  return { id: sid(o.id, 'pg'), slug, title, body, published: o.published !== false, layout, blocks }
}

function blocksOf(v: unknown): HomeBlock[] {
  return Array.isArray(v) ? v.slice(0, 40).map(cleanBlock).filter((x): x is HomeBlock => !!x) : []
}

function framesOf(v: unknown): PageFrame[] {
  const raw = Array.isArray(v) ? v : []
  return emptyFrames().map((frame) => {
    const found = raw.find((x) => x && typeof x === 'object' && (x as PageFrame).id === frame.id) as Partial<PageFrame> | undefined
    return { id: frame.id, before: blocksOf(found?.before), after: blocksOf(found?.after) }
  })
}

function num(v: unknown, fallback: number, max: number) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(1, n))
}

function slugs(v: unknown) {
  if (!Array.isArray(v)) return []
  return v.filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s)).slice(0, 24)
}

function cleanBlock(v: unknown): HomeBlock | null {
  if (!v || typeof v !== 'object') return null
  const o = v as { type?: unknown; id?: unknown; enabled?: unknown }
  const id = sid(o.id, 'b')
  const enabled = o.enabled !== false
  const type = o.type
  if (type === 'hero') {
    const x = v as Extract<HomeBlock, { type: 'hero' }>
    return { id, type, enabled, headline: bi(x.headline, 180), sub: bi(x.sub, 280), cta: bi(x.cta, 40), href: safeHref(clip(x.href, 240)), slugs: slugs(x.slugs) }
  }
  if (type === 'bestsellers') {
    const x = v as Extract<HomeBlock, { type: 'bestsellers' }>
    return { id, type, enabled, title: bi(x.title, 180), cta: bi(x.cta, 40), href: safeHref(clip(x.href, 240)), limit: num(x.limit, 8, 24), slugs: slugs(x.slugs) }
  }
  if (type === 'rail') {
    const x = v as Extract<HomeBlock, { type: 'rail' }>
    const source = SOURCES.has(x.source) ? x.source : 'manual'
    // Any category id (built-in or added by the owner): lowercase latin, digits, hyphens.
    const category = typeof x.category === 'string' && /^[a-z0-9-]{1,40}$/.test(x.category) ? x.category : ''
    return {
      id, type, enabled, title: bi(x.title, 140), sub: bi(x.sub, 220), cta: bi(x.cta, 40), href: safeHref(clip(x.href, 240)),
      tone: x.tone === 'blush' ? 'blush' : 'plain', source, slugs: slugs(x.slugs), brand: clip(x.brand, 60), category, limit: num(x.limit, 8, 24),
    }
  }
  if (type === 'categories') {
    const x = v as Extract<HomeBlock, { type: 'categories' }>
    return { id, type, enabled, title: bi(x.title, 140), sub: bi(x.sub, 220) }
  }
  if (type === 'promises') {
    const x = v as Extract<HomeBlock, { type: 'promises' }>
    const items = Array.isArray(x.items) ? x.items.slice(0, 12).map((it) => ({ id: sid(it?.id, 'p'), title: bi(it?.title, 120), body: bi(it?.body, 800) })) : []
    return { id, type, enabled, title: bi(x.title, 180), slugs: slugs(x.slugs), items }
  }
  if (type === 'quotes') return { id, type, enabled }
  if (type === 'marquee') {
    const x = v as Extract<HomeBlock, { type: 'marquee' }>
    return { id, type, enabled, text: bi(x.text, 80), label: bi(x.label, 40) }
  }
  if (type === 'spin') {
    const x = v as Extract<HomeBlock, { type: 'spin' }>
    return { id, type, enabled, slug: slugs([x.slug])[0] ?? '' }
  }
  if (type === 'lot') {
    const x = v as Extract<HomeBlock, { type: 'lot' }>
    return { id, type, enabled, title: bi(x.title, 180), body: bi(x.body, 600), cta: bi(x.cta, 40), href: x.href ? safeHref(clip(x.href, 240)) : '', slug: slugs([x.slug])[0] ?? '' }
  }
  if (type === 'routines') {
    const x = v as Extract<HomeBlock, { type: 'routines' }>
    const cards = Array.isArray(x.cards)
      ? x.cards.slice(0, 12).map((c) => ({
          id: sid(c?.id, 'r'),
          title: bi(c?.title, 80),
          href: safeHref(clip(c?.href, 240)),
          badge: bi(c?.badge, 20),
          skin: SKINS.has(c?.skin as SkinType) ? c.skin : '',
          concern: CONCERNS.has(c?.concern as Concern) ? c.concern : '',
        }))
      : []
    return { id, type, enabled, title: bi(x.title, 80), cards }
  }
  if (type === 'brands') {
    const x = v as Extract<HomeBlock, { type: 'brands' }>
    return { id, type, enabled, title: bi(x.title, 140), sub: bi(x.sub, 220) }
  }
  if (type === 'text') {
    const x = v as Extract<HomeBlock, { type: 'text' }>
    return { id, type, enabled, title: bi(x.title, 180), body: bi(x.body, 2000), cta: bi(x.cta, 40), href: x.href ? safeHref(clip(x.href, 240)) : '' }
  }
  if (type === 'panel') {
    const x = v as Extract<HomeBlock, { type: 'panel' }>
    const shape = PANEL_SHAPE_IDS.has(x.shape) ? x.shape : 'banner'
    const items = Array.isArray(x.items) ? x.items.slice(0, 8).map((it) => ({ id: sid(it?.id, 'i'), title: bi(it?.title, 80), body: bi(it?.body, 280) })) : []
    return {
      id, type, enabled, shape,
      title: bi(x.title, 180), sub: bi(x.sub, 220), body: bi(x.body, 800), cta: bi(x.cta, 40),
      href: x.href ? safeHref(clip(x.href, 240)) : '',
      slugs: slugs(x.slugs),
      items,
    }
  }
  return null
}

/** Drop anything the editor should not be able to store: scripts, huge lists, unknown blocks. */
export function sanitizeStorefront(raw: unknown): StorefrontContent {
  const base = defaultStorefront()
  const o = raw && typeof raw === 'object' ? (raw as Partial<StorefrontContent>) : {}
  const used = new Set<string>()
  const pages = Array.isArray(o.pages) ? o.pages.slice(0, 40).map((p) => page(p, used)).filter((p): p is StorePage => !!p) : []
  const footer = o.footer && typeof o.footer === 'object' ? o.footer : base.footer
  return {
    seoTitle: bi(o.seoTitle, 80),
    seoDescription: bi(o.seoDescription, 220),
    slogan: bi(o.slogan, 80),
    ticker: Array.isArray(o.ticker) ? o.ticker.slice(0, 20).map((t) => bi(t, 80)).filter((t) => t.ar.trim() || t.en.trim()) : base.ticker,
    nav: Array.isArray(o.nav) ? o.nav.slice(0, 30).map(navItem).filter((n) => n.label.ar.trim() || n.label.en.trim()) : base.nav,
    blocks: Array.isArray(o.blocks) ? blocksOf(o.blocks) : base.blocks,
    footer: {
      clubTitle: bi(footer.clubTitle, 80),
      clubNote: bi(footer.clubNote, 160),
      clubOk: bi(footer.clubOk, 120),
      columns: Array.isArray(footer.columns) ? footer.columns.slice(0, 6).map(column) : base.footer.columns,
      legalMode: footer.legalMode === 'custom' ? 'custom' : 'auto',
      legal: bi(footer.legal, 400),
    },
    pages,
    frames: framesOf(o.frames),
  }
}

export function resolveStorefront(settings: Settings): StorefrontContent {
  if (!settings.storefront || !Array.isArray(settings.storefront.blocks)) return defaultStorefront()
  return sanitizeStorefront(settings.storefront)
}

export function activeProducts(products: Product[]) {
  return products.filter((p) => p.status === 'active')
}

/** Products a homepage row should show. Manual slugs win when the source is manual or the list is non-empty for hero/bestsellers. */
export function pickProducts(products: Product[], spec: { source: RailSource; slugs: string[]; brand: string; category: string; limit: number }) {
  const active = activeProducts(products)
  const bySlug = (list: string[]) => list.map((s) => active.find((p) => p.slug === s)).filter((p): p is Product => !!p)
  let list: Product[]
  if (spec.source === 'manual') list = bySlug(spec.slugs)
  else if (spec.source === 'best') list = [...active].sort((a, b) => b.reviewCount - a.reviewCount || Number(!!b.featured) - Number(!!a.featured))
  else if (spec.source === 'offers') list = active.filter((p) => p.compareAt && p.compareAt > p.price)
  else if (spec.source === 'new') list = [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  else if (spec.source === 'brand') list = active.filter((p) => p.brand === spec.brand)
  else list = active.filter((p) => p.category === spec.category)
  if (spec.source !== 'manual' && spec.slugs.length) {
    const pinned = bySlug(spec.slugs)
    if (pinned.length) list = pinned
  }
  return list.slice(0, spec.limit)
}

export function heroProducts(products: Product[], slugs: string[]) {
  const active = activeProducts(products)
  const picked = (slugs.length ? slugs : HERO_SLUGS).map((s) => active.find((p) => p.slug === s)).filter((p): p is Product => !!p)
  return picked.length >= 3 ? picked : active.filter((p) => p.image).slice(0, 5)
}

export function bestProducts(products: Product[], slugs: string[], limit: number) {
  if (slugs.length) return pickProducts(products, { source: 'manual', slugs, brand: '', category: '', limit })
  return pickProducts(products, { source: 'best', slugs: [], brand: '', category: '', limit })
}
