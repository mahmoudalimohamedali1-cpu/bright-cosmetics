import type { Category, Origin, Product, SkinType, Concern } from './types'
import { REAL } from './catalog.real'
import { daysAgoISO, daysFromNowISO, rng } from '../lib/rand'

/*
  Bright's catalogue: the owner's real products (see catalog.real.ts). Stock,
  lots, costs, ratings and review counts below are still demo values until the
  owner records real shipments; estimated prices carry the price-to-confirm tag.
*/

const CAT_DESC: Record<Category, [string, string]> = {
  cleanser: ['Massage onto damp skin for 30–60 seconds, then rinse with lukewarm water.', 'دلّكيه على بشرة مبلولة 30–60 ثانية وبعدين اشطفي بمية فاترة.'],
  toner: ['Pat into clean skin with palms or a cotton pad. Layer up to three times on dry days.', 'ربّتي على بشرة نظيفة بإيدك أو بقطنة. كرّريه لحد 3 مرات في الأيام الجافة.'],
  essence: ['After toner, press 2–3 drops into the face and neck until absorbed.', 'بعد التونر، اضغطي 2–3 نقط على الوش والرقبة لحد ما تتشرب.'],
  serum: ['Apply 2–3 drops after toner. Follow with moisturizer.', 'حطّي 2–3 نقط بعد التونر، وبعدين المرطّب.'],
  moisturizer: ['Smooth a pea-sized amount over face and neck as the last step before sunscreen.', 'وزّعي كمية قد حبة البسلة على الوش والرقبة كآخر خطوة قبل واقي الشمس.'],
  sunscreen: ['Apply two finger-lengths 15 minutes before sun. Reapply every 2 hours outdoors.', 'حطّي طول صباعين قبل الشمس بربع ساعة، وجدّدي كل ساعتين برّه.'],
  mask: ['Use 2–3 times a week on cleansed, toned skin.', 'استخدميه 2–3 مرات في الأسبوع على بشرة نظيفة بعد التونر.'],
  makeup: ['Press lightly from the centre of the face outward. Build in thin layers.', 'اضغطي بخفة من نص الوش لبرّه، وابني التغطية بطبقات رفيعة.'],
  eye: ['Tap a rice-grain amount around the eye area with your ring finger, morning and night.', 'طبطبي كمية قد حبة الرز حوالين العين بصباعك البنصر، الصبح وبالليل.'],
  hair: ['Use on wet hair, massage into scalp and lengths, leave a few minutes, then rinse well.', 'استخدميه على شعر مبلول، دلّكي فروة الراس والأطراف، سيبيه دقايق واشطفي كويس.'],
  lip: ['Apply a generous layer before bed or whenever lips feel dry.', 'حطّي طبقة كويسة قبل النوم أو كل ما شفايفك تنشف.'],
}


const BESTSELLERS = new Set([
  'the-ordinary-niacinamide-10-zinc-1',
  'anua-niacinamide-10-txa-4-serum',
  'dr-althea-345-relief-cream',
  'derma-ten-hydra-power',
  'arencia-fresh-rosehip-rice-mochi-cleanser',
])

const FALLBACK_VISUAL: Record<string, Product['visual']> = {
  cleanser: { shape: 'jar', body: '#f1d9cf', cap: '#ffffff', label: '#ffffff', text: '#1f0229' },
  hair: { shape: 'jar', body: '#3d2a1e', cap: '#ffffff', label: '#ffffff', text: '#1f0229' },
  moisturizer: { shape: 'tube', body: '#ffffff', cap: '#ffffff', label: '#ffffff', text: '#1f0229' },
  default: { shape: 'dropper', body: '#e9e6df', cap: '#1a1a1a', label: '#ffffff', text: '#1a1a1a' },
}

export function buildCatalog(): Product[] {
  const r = rng(20261011)
  return REAL.map((s, i) => {
    const id = `p${String(i + 1).padStart(3, '0')}`
    const cost = Math.round(s.price * (0.42 + r() * 0.16))
    const lowStockAt = s.price > 2000 ? 4 : 10
    const nBatches = 1 + Math.floor(r() * 3)
    // Demo stock and lots until the owner records real shipments.
    const batches = Array.from({ length: nBatches }, (_, b) => {
      const expDays = b === 0 && r() < 0.28 ? 20 + Math.floor(r() * 70) : 180 + Math.floor(r() * 600)
      return {
        id: `${id}-b${b + 1}`,
        lot: `${s.origin}${(24 + b).toString()}${String(Math.floor(r() * 9000) + 1000)}`,
        qty: Math.max(0, Math.floor(r() * 60) - (b === 0 && r() < 0.2 ? 40 : 0)),
        expiry: daysFromNowISO(expDays),
        receivedAt: daysAgoISO(30 + Math.floor(r() * 200)),
        shipmentId: `sh${(i % 6) + 1}`,
      }
    })
    const [howEn, howAr] = CAT_DESC[s.category]
    const best = BESTSELLERS.has(s.slug)
    return {
      id,
      slug: s.slug,
      sku: `BR-${s.brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      barcode: '',
      brand: s.brand,
      origin: s.origin,
      name: { ar: s.ar, en: s.en },
      short: { ar: s.shortAr, en: s.shortEn },
      description: { ar: s.descAr, en: s.descEn },
      howToUse: { en: s.howEn || howEn, ar: s.howAr || howAr },
      category: s.category,
      routineStep: s.step,
      routineTime: s.time,
      skinTypes: s.skin,
      concerns: s.concerns,
      ingredients: s.ing.map(([en, ar]) => ({ en, ar })),
      size: s.size,
      price: s.price,
      compareAt: s.compareAt ?? undefined,
      priceConfirmed: s.priceConfirmed,
      cost,
      batches,
      lowStockAt,
      visual: FALLBACK_VISUAL[s.category] ?? FALLBACK_VISUAL.default,
      image: s.image,
      gallery: s.gallery,
      rating: Math.round((4.3 + r() * 0.65) * 10) / 10,
      reviewCount: 12 + Math.floor(r() * 420),
      tags: [...(best ? ['bestseller'] : []), ...(s.priceConfirmed ? [] : ['price-to-confirm'])],
      status: 'active',
      createdAt: daysAgoISO(30 + Math.floor(r() * 300)),
      featured: best,
    }
  })
}

export function originName(o: Origin) {
  return {
    KR: { en: 'Korea', ar: 'كوريا' },
    FR: { en: 'France', ar: 'فرنسا' },
    US: { en: 'the USA', ar: 'أمريكا' },
    JP: { en: 'Japan', ar: 'اليابان' },
    CA: { en: 'Canada', ar: 'كندا' },
    DE: { en: 'Germany', ar: 'ألمانيا' },
    EG: { en: 'Egypt', ar: 'مصر' },
    CN: { en: 'China', ar: 'الصين' },
  }[o]
}

export const CATEGORY_LABEL: Record<Category, { ar: string; en: string }> = {
  cleanser: { ar: 'غسول ومنظّفات', en: 'Cleansers' },
  toner: { ar: 'تونر وباد', en: 'Toners & pads' },
  essence: { ar: 'إيسنس', en: 'Essences' },
  serum: { ar: 'سيروم وأمبول', en: 'Serums & ampoules' },
  moisturizer: { ar: 'مرطّبات', en: 'Moisturizers' },
  sunscreen: { ar: 'واقي شمس', en: 'Sunscreen' },
  mask: { ar: 'ماسكات', en: 'Masks' },
  makeup: { ar: 'مكياج', en: 'Makeup' },
  lip: { ar: 'شفايف', en: 'Lips' },
  eye: { ar: 'العناية بالعين', en: 'Eye care' },
  hair: { ar: 'العناية بالشعر', en: 'Hair care' },
}

export const SKIN_LABEL: Record<SkinType, { ar: string; en: string }> = {
  oily: { ar: 'دهنية', en: 'Oily' },
  dry: { ar: 'جافة', en: 'Dry' },
  combination: { ar: 'مختلطة', en: 'Combination' },
  sensitive: { ar: 'حساسة', en: 'Sensitive' },
  normal: { ar: 'عادية', en: 'Normal' },
}

export const CONCERN_LABEL: Record<Concern, { ar: string; en: string }> = {
  acne: { ar: 'حبوب', en: 'Breakouts' },
  hydration: { ar: 'ترطيب', en: 'Hydration' },
  brightening: { ar: 'نضارة وتفتيح', en: 'Glow & tone' },
  aging: { ar: 'خطوط وتجاعيد', en: 'Fine lines' },
  pores: { ar: 'مسام', en: 'Pores' },
  redness: { ar: 'احمرار', en: 'Redness' },
  sun: { ar: 'حماية من الشمس', en: 'Sun care' },
  barrier: { ar: 'حاجز البشرة', en: 'Skin barrier' },
}

export const STEP_LABEL: Record<number, { ar: string; en: string }> = {
  1: { ar: 'تنظيف', en: 'Cleanse' },
  2: { ar: 'تونر', en: 'Tone' },
  3: { ar: 'علاج', en: 'Treat' },
  4: { ar: 'ماسك', en: 'Mask' },
  5: { ar: 'ترطيب', en: 'Moisturize' },
  6: { ar: 'حماية', en: 'Protect' },
}
