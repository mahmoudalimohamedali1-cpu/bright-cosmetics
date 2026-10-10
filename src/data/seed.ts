import type {
  AbandonedCart,
  Activity,
  Channel,
  Customer,
  Discount,
  Governorate,
  Order,
  OrderEvent,
  PaymentMethod,
  Product,
  Review,
  Settings,
  Shipment,
  ShippingZone,
  SkinType,
  Staff,
} from './types'
import { buildCatalog } from './catalog'
import { DAY, daysAgoISO, pickOne, rng } from '../lib/rand'

/* All people, orders, and figures below are synthetic demo data. */

export const GOVERNORATES: Governorate[] = [
  { id: 'cai', name: { ar: 'القاهرة', en: 'Cairo' }, zone: 'cairo' },
  { id: 'giz', name: { ar: 'الجيزة', en: 'Giza' }, zone: 'cairo' },
  { id: 'qlb', name: { ar: 'القليوبية', en: 'Qalyubia' }, zone: 'cairo' },
  { id: 'alx', name: { ar: 'الإسكندرية', en: 'Alexandria' }, zone: 'delta' },
  { id: 'dak', name: { ar: 'الدقهلية', en: 'Dakahlia' }, zone: 'delta' },
  { id: 'shr', name: { ar: 'الشرقية', en: 'Sharqia' }, zone: 'delta' },
  { id: 'gha', name: { ar: 'الغربية', en: 'Gharbia' }, zone: 'delta' },
  { id: 'mnf', name: { ar: 'المنوفية', en: 'Monufia' }, zone: 'delta' },
  { id: 'bhr', name: { ar: 'البحيرة', en: 'Beheira' }, zone: 'delta' },
  { id: 'kfs', name: { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' }, zone: 'delta' },
  { id: 'dmt', name: { ar: 'دمياط', en: 'Damietta' }, zone: 'delta' },
  { id: 'pts', name: { ar: 'بورسعيد', en: 'Port Said' }, zone: 'canal' },
  { id: 'ism', name: { ar: 'الإسماعيلية', en: 'Ismailia' }, zone: 'canal' },
  { id: 'suz', name: { ar: 'السويس', en: 'Suez' }, zone: 'canal' },
  { id: 'fym', name: { ar: 'الفيوم', en: 'Faiyum' }, zone: 'upper' },
  { id: 'bns', name: { ar: 'بني سويف', en: 'Beni Suef' }, zone: 'upper' },
  { id: 'mny', name: { ar: 'المنيا', en: 'Minya' }, zone: 'upper' },
  { id: 'ast', name: { ar: 'أسيوط', en: 'Asyut' }, zone: 'upper' },
  { id: 'shg', name: { ar: 'سوهاج', en: 'Sohag' }, zone: 'upper' },
  { id: 'qna', name: { ar: 'قنا', en: 'Qena' }, zone: 'upper' },
  { id: 'lxr', name: { ar: 'الأقصر', en: 'Luxor' }, zone: 'upper' },
  { id: 'asw', name: { ar: 'أسوان', en: 'Aswan' }, zone: 'upper' },
  { id: 'rsa', name: { ar: 'البحر الأحمر', en: 'Red Sea' }, zone: 'remote' },
  { id: 'ssn', name: { ar: 'جنوب سيناء', en: 'South Sinai' }, zone: 'remote' },
  { id: 'nsn', name: { ar: 'شمال سيناء', en: 'North Sinai' }, zone: 'remote' },
  { id: 'mtr', name: { ar: 'مطروح', en: 'Matrouh' }, zone: 'remote' },
  { id: 'wad', name: { ar: 'الوادي الجديد', en: 'New Valley' }, zone: 'remote' },
]

export const ZONES: ShippingZone[] = [
  { id: 'cairo', name: { ar: 'القاهرة الكبرى', en: 'Greater Cairo' }, rate: 55, freeOver: 1500, etaDays: [1, 2], codFee: 15, enabled: true },
  { id: 'delta', name: { ar: 'الإسكندرية والدلتا', en: 'Alexandria & Delta' }, rate: 70, freeOver: 1800, etaDays: [2, 3], codFee: 15, enabled: true },
  { id: 'canal', name: { ar: 'مدن القناة', en: 'Canal cities' }, rate: 70, freeOver: 1800, etaDays: [2, 3], codFee: 15, enabled: true },
  { id: 'upper', name: { ar: 'الصعيد', en: 'Upper Egypt' }, rate: 85, freeOver: 2200, etaDays: [3, 5], codFee: 20, enabled: true },
  { id: 'remote', name: { ar: 'المناطق البعيدة', en: 'Remote areas' }, rate: 110, freeOver: 3000, etaDays: [4, 7], codFee: 25, enabled: true },
]

const FIRST: [string, string][] = [
  ['نور', 'Nour'], ['سلمى', 'Salma'], ['ملك', 'Malak'], ['هنا', 'Hana'], ['فريدة', 'Farida'], ['جنى', 'Jana'],
  ['ياسمين', 'Yasmin'], ['مريم', 'Mariam'], ['رنا', 'Rana'], ['دينا', 'Dina'], ['شهد', 'Shahd'], ['لينا', 'Lina'],
  ['آية', 'Aya'], ['منة', 'Menna'], ['ندى', 'Nada'], ['روان', 'Rawan'], ['حبيبة', 'Habiba'], ['سارة', 'Sara'],
  ['ليلى', 'Laila'], ['هدى', 'Hoda'], ['إسراء', 'Esraa'], ['بسمة', 'Basma'], ['تقى', 'Toqa'], ['أمنية', 'Omnia'],
  ['عمر', 'Omar'], ['يوسف', 'Youssef'], ['كريم', 'Karim'], ['مازن', 'Mazen'],
]
const LAST: [string, string][] = [
  ['الشريف', 'El Sherif'], ['عبد الحميد', 'Abdelhamid'], ['منصور', 'Mansour'], ['فهمي', 'Fahmy'], ['سالم', 'Salem'],
  ['حسني', 'Hosny'], ['البنا', 'El Banna'], ['رضوان', 'Radwan'], ['عزت', 'Ezzat'], ['النجار', 'El Naggar'],
  ['خليل', 'Khalil'], ['شاكر', 'Shaker'], ['زكي', 'Zaki'], ['الجمال', 'El Gamal'], ['قاسم', 'Kassem'], ['مراد', 'Mourad'],
]

const GOV_WEIGHTS: [string, number][] = [
  ['cai', 30], ['giz', 18], ['alx', 12], ['qlb', 5], ['dak', 5], ['shr', 4], ['gha', 3], ['mnf', 3], ['ism', 2],
  ['pts', 2], ['suz', 2], ['bhr', 2], ['ast', 2], ['mny', 2], ['rsa', 2], ['lxr', 1], ['asw', 1], ['ssn', 1],
  ['fym', 1], ['shg', 1], ['dmt', 1], ['kfs', 1], ['bns', 1], ['qna', 1], ['mtr', 1], ['nsn', 0.5], ['wad', 0.5],
]

function weighted<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [v, w] of items) {
    x -= w
    if (x <= 0) return v
  }
  return items[items.length - 1][0]
}

export type Db = {
  products: Product[]
  customers: Customer[]
  orders: Order[]
  reviews: Review[]
  discounts: Discount[]
  abandoned: AbandonedCart[]
  shipments: Shipment[]
  zones: ShippingZone[]
  staff: Staff[]
  activity: Activity[]
  settings: Settings
}

export function buildSeed(): Db {
  const r = rng(77)
  const products = buildCatalog()
  const active = products.filter((p) => p.status === 'active')
  const skinTypes: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']

  // Customers
  const customers: Customer[] = Array.from({ length: 180 }, (_, i) => {
    const [fa, fe] = pickOne(r, FIRST)
    const [la, le] = pickOne(r, LAST)
    const gov = weighted(r, GOV_WEIGHTS)
    const created = Math.floor(r() * 360)
    const skin = pickOne(r, skinTypes)
    return {
      id: `c${String(i + 1).padStart(4, '0')}`,
      name: { ar: `${fa} ${la}`, en: `${fe} ${le}` },
      email: `${fe.toLowerCase()}.${le.toLowerCase().replace(/\s+/g, '')}${i}@example.com`,
      phone: `01${pickOne(r, ['0', '1', '2', '5'])}${String(Math.floor(r() * 1e8)).padStart(8, '0')}`,
      governorateId: gov,
      skinType: skin,
      concerns: [pickOne(r, ['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness'] as const)],
      createdAt: daysAgoISO(created, 9 + Math.floor(r() * 12)),
      tags: r() < 0.08 ? ['influencer'] : r() < 0.1 ? ['wholesale'] : [],
      acceptsMarketing: r() < 0.72,
    }
  })

  // Orders — ~180 days, growth trend, weekly rhythm, Ramadan-free simple model
  const orders: Order[] = []
  const zoneOf = (gid: string) => GOVERNORATES.find((g) => g.id === gid)!.zone
  let number = 1001
  const channels: [Channel, number][] = [['web', 55], ['instagram', 20], ['tiktok', 12], ['whatsapp', 10], ['pos', 3]]
  const pays: [PaymentMethod, number][] = [['cod', 58], ['card', 22], ['wallet', 12], ['instapay', 8]]
  const couriers = ['Bosta', 'Aramex', 'J&T', 'Mylerz'] as const
  for (let d = 180; d >= 0; d--) {
    const date = new Date(Date.now() - d * DAY)
    const dow = date.getDay()
    const growth = 1 + (180 - d) / 140
    const weekly = dow === 5 ? 0.75 : dow === 4 || dow === 6 ? 1.25 : 1
    const n = Math.max(0, Math.round((2.6 + r() * 2.4) * growth * weekly))
    for (let k = 0; k < n; k++) {
      const cust = customers[Math.floor(Math.pow(r(), 1.6) * customers.length)]
      if (new Date(cust.createdAt).getTime() > date.getTime() + DAY) continue
      const nLines = 1 + Math.floor(Math.pow(r(), 1.8) * 4)
      const used = new Set<string>()
      const lines = []
      for (let l = 0; l < nLines; l++) {
        // Skew toward bestsellers and skin-matched products
        const pool = r() < 0.55 ? active.filter((p) => p.skinTypes.includes(cust.skinType)) : active
        const p = pool[Math.floor(Math.pow(r(), 1.3) * pool.length)]
        if (used.has(p.id)) continue
        used.add(p.id)
        lines.push({ productId: p.id, qty: r() < 0.85 ? 1 : 2, price: p.price, cost: p.cost, batchId: p.batches[0]?.id })
      }
      const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0)
      const zone = ZONES.find((z) => z.id === zoneOf(cust.governorateId))!
      const shipping = subtotal >= zone.freeOver ? 0 : zone.rate
      const payment = weighted(r, pays)
      const codFee = payment === 'cod' ? zone.codFee : 0
      const hasCode = r() < 0.18
      const discount = hasCode ? Math.round(subtotal * 0.1) : 0
      const hour = 9 + Math.floor(r() * 14)
      const at = new Date(date)
      at.setHours(hour, Math.floor(r() * 60), 0, 0)
      // Today's orders can't be in the future
      if (at.getTime() > Date.now()) at.setTime(Date.now() - Math.floor(r() * 5 * 3600000) - 60000)
      const ageH = (Date.now() - at.getTime()) / 3600000

      // Lifecycle by age
      let fulfillment: Order['fulfillment'] = 'delivered'
      let status: Order['status'] = 'confirmed'
      let paymentStatus: Order['paymentStatus'] = 'paid'
      const events: OrderEvent[] = [{ at: at.toISOString(), type: 'placed' }]
      const cancelled = r() < 0.045
      const returned = !cancelled && r() < 0.03
      if (cancelled) {
        status = 'cancelled'
        fulfillment = 'unfulfilled'
        paymentStatus = payment === 'cod' ? 'pending' : 'refunded'
        events.push({ at: new Date(at.getTime() + 2 * 3600000).toISOString(), type: 'cancelled', note: 'Customer unreachable' })
      } else if (ageH < 6) {
        status = 'open'
        fulfillment = 'unfulfilled'
        paymentStatus = payment === 'cod' ? 'pending' : 'paid'
      } else if (ageH < 24) {
        fulfillment = r() < 0.5 ? 'unfulfilled' : 'packed'
        paymentStatus = payment === 'cod' ? 'pending' : 'paid'
        events.push({ at: new Date(at.getTime() + 3600000).toISOString(), type: payment === 'cod' ? 'whatsapp_confirmed' : 'confirmed' })
        if (fulfillment === 'packed') events.push({ at: new Date(at.getTime() + 4 * 3600000).toISOString(), type: 'packed' })
      } else if (ageH < 72) {
        fulfillment = 'shipped'
        paymentStatus = payment === 'cod' ? 'pending' : 'paid'
        events.push(
          { at: new Date(at.getTime() + 3600000).toISOString(), type: payment === 'cod' ? 'whatsapp_confirmed' : 'confirmed' },
          { at: new Date(at.getTime() + 5 * 3600000).toISOString(), type: 'packed' },
          { at: new Date(at.getTime() + 20 * 3600000).toISOString(), type: 'shipped' },
        )
      } else {
        events.push(
          { at: new Date(at.getTime() + 3600000).toISOString(), type: payment === 'cod' ? 'whatsapp_confirmed' : 'confirmed' },
          { at: new Date(at.getTime() + 5 * 3600000).toISOString(), type: 'packed' },
          { at: new Date(at.getTime() + 20 * 3600000).toISOString(), type: 'shipped' },
          { at: new Date(at.getTime() + 60 * 3600000).toISOString(), type: 'delivered' },
        )
        if (returned) {
          fulfillment = 'returned'
          paymentStatus = 'refunded'
          events.push({ at: new Date(at.getTime() + 120 * 3600000).toISOString(), type: 'returned' })
        }
      }

      const total = subtotal - discount + shipping + codFee
      orders.push({
        id: `o${number}`,
        number,
        customerId: cust.id,
        createdAt: at.toISOString(),
        lines,
        subtotal,
        discount,
        discountCode: hasCode ? pickOne(r, ['GLOW10', 'NURI10', 'WELCOME10']) : undefined,
        shipping,
        codFee,
        total,
        payment,
        paymentStatus,
        fulfillment,
        status,
        governorateId: cust.governorateId,
        address: `${10 + Math.floor(r() * 140)} ${pickOne(r, ['شارع التسعين', 'شارع مصدق', 'شارع النصر', 'شارع جامعة الدول', 'شارع الهرم', 'طريق الكورنيش', 'شارع عباس العقاد'])}`,
        channel: weighted(r, channels),
        courier: fulfillment !== 'unfulfilled' && fulfillment !== 'packed' ? pickOne(r, couriers) : undefined,
        tracking: fulfillment !== 'unfulfilled' && fulfillment !== 'packed' ? `TRK${Math.floor(r() * 1e9)}` : undefined,
        events,
        tags: total > 3000 ? ['vip'] : [],
        risk: payment === 'cod' && total > 3500 ? 'medium' : r() < 0.02 ? 'high' : 'low',
      })
      number++
    }
  }

  // Reviews
  const titlesAr = ['فرق معايا من أول أسبوع', 'أصلي 100%', 'ريحته هادية وملمسه حلو', 'بشرتي ارتاحت', 'هشتريه تاني أكيد', 'كويس بس محتاج وقت']
  const titlesEn = ['Worked from week one', 'Genuine, checked the lot', 'Light and calm', 'My skin finally settled', 'Repurchasing', 'Good, give it time']
  const bodiesAr = [
    'استخدمته شهر على بشرتي المختلطة والحبوب قلّت بشكل واضح. التغليف وصل سليم ورقم التشغيلة مطابق.',
    'التوصيل كان سريع والدفع عند الاستلام سهّل الموضوع. المنتج نفس اللي كنت بجيبه من كوريا.',
    'ملمسه خفيف ومش بيسيب لزوجة، وبيمشي تحت الواقي من غير ما يكوّر.',
    'كنت خايفة من التقليد بس الكود اتشيك على موقع البراند. هكمل عليه.',
  ]
  const bodiesEn = [
    'Used it for a month on combination skin and breakouts calmed down a lot. Arrived sealed and the lot matched.',
    'Fast delivery, paid cash on delivery. Same product I used to bring back from Seoul.',
    'Light texture, no stickiness, layers under sunscreen without pilling.',
  ]
  const reviews: Review[] = []
  for (let i = 0; i < 140; i++) {
    const o = orders[Math.floor(r() * orders.length)]
    const line = o.lines[0]
    const cust = customers.find((c) => c.id === o.customerId)!
    const ar = r() < 0.7
    const rating = r() < 0.75 ? 5 : r() < 0.7 ? 4 : r() < 0.6 ? 3 : 2
    reviews.push({
      id: `rv${i + 1}`,
      productId: line.productId,
      customerId: cust.id,
      rating,
      title: ar ? pickOne(r, titlesAr) : pickOne(r, titlesEn),
      body: ar ? pickOne(r, bodiesAr) : pickOne(r, bodiesEn),
      lang: ar ? 'ar' : 'en',
      createdAt: new Date(new Date(o.createdAt).getTime() + 5 * DAY).toISOString(),
      status: i < 9 ? 'pending' : 'published',
      skinType: cust.skinType,
      verified: true,
    })
  }

  const discounts: Discount[] = [
    { id: 'd1', code: 'WELCOME10', title: { ar: 'خصم أول طلب 10%', en: '10% off first order' }, kind: 'percent', value: 10, minSubtotal: 0, used: 412, startsAt: daysAgoISO(200), active: true, automatic: false, appliesTo: 'all' },
    { id: 'd2', code: 'GLOW10', title: { ar: 'جلو 10%', en: 'Glow 10%' }, kind: 'percent', value: 10, minSubtotal: 800, usageLimit: 1000, used: 268, startsAt: daysAgoISO(90), endsAt: daysAgoISO(-30), active: true, automatic: false, appliesTo: 'all' },
    { id: 'd3', code: 'FREESHIP', title: { ar: 'شحن مجاني فوق 1200', en: 'Free shipping over 1,200' }, kind: 'free_shipping', value: 0, minSubtotal: 1200, used: 190, startsAt: daysAgoISO(60), active: true, automatic: false, appliesTo: 'all' },
    { id: 'd4', code: 'SPF2', title: { ar: 'واقي الشمس: التاني بنص التمن', en: 'Sunscreen: second at half price' }, kind: 'bogo', value: 50, minSubtotal: 0, used: 77, startsAt: daysAgoISO(20), endsAt: daysAgoISO(-40), active: true, automatic: true, appliesTo: 'category', target: ['sunscreen'] },
    { id: 'd5', code: 'ROUTINE15', title: { ar: 'روتين كامل 15%', en: 'Full routine 15%' }, kind: 'bundle', value: 15, minSubtotal: 0, used: 54, startsAt: daysAgoISO(45), active: true, automatic: true, appliesTo: 'all' },
    { id: 'd6', code: 'NURI10', title: { ar: 'نوري 10 (إنفلونسر)', en: 'NURI 10 (influencer)' }, kind: 'percent', value: 10, minSubtotal: 0, used: 133, startsAt: daysAgoISO(120), endsAt: daysAgoISO(10), active: false, automatic: false, appliesTo: 'all' },
  ]

  const abandoned: AbandonedCart[] = Array.from({ length: 26 }, (_, i) => {
    const c = r() < 0.7 ? customers[Math.floor(r() * customers.length)] : undefined
    const lines = Array.from({ length: 1 + Math.floor(r() * 3) }, () => ({ productId: active[Math.floor(r() * active.length)].id, qty: 1 }))
    const total = lines.reduce((s, l) => s + products.find((p) => p.id === l.productId)!.price, 0)
    return {
      id: `ab${i + 1}`,
      customerId: c?.id,
      phone: c?.phone ?? `0100${String(Math.floor(r() * 1e7)).padStart(7, '0')}`,
      createdAt: new Date(Date.now() - r() * 7 * DAY).toISOString(),
      lines,
      total,
      stage: pickOne(r, ['cart', 'checkout_info', 'checkout_shipping', 'checkout_payment'] as const),
      recovered: r() < 0.22,
      remindersSent: Math.floor(r() * 3),
    }
  })

  const shipments: Shipment[] = [
    { id: 'sh1', supplier: 'Seoul Beauty Trading Co.', origin: 'KR', createdAt: daysAgoISO(210), arrivedAt: daysAgoISO(180), status: 'received', freight: 18500, customs: 42000, lines: active.filter((p) => p.origin === 'KR').slice(0, 8).map((p) => ({ productId: p.id, qty: 60, unitCost: Math.round(p.cost * 0.7) })) },
    { id: 'sh2', supplier: 'Seoul Beauty Trading Co.', origin: 'KR', createdAt: daysAgoISO(120), arrivedAt: daysAgoISO(96), status: 'received', freight: 21000, customs: 51000, lines: active.filter((p) => p.origin === 'KR').slice(8, 18).map((p) => ({ productId: p.id, qty: 48, unitCost: Math.round(p.cost * 0.7) })) },
    { id: 'sh3', supplier: 'Pharma Europe Distribution', origin: 'FR', createdAt: daysAgoISO(75), arrivedAt: daysAgoISO(58), status: 'received', freight: 9800, customs: 23000, lines: active.filter((p) => p.origin === 'FR').map((p) => ({ productId: p.id, qty: 36, unitCost: Math.round(p.cost * 0.72) })) },
    { id: 'sh4', supplier: 'Seoul Beauty Trading Co.', origin: 'KR', createdAt: daysAgoISO(18), status: 'customs', freight: 19800, customs: 0, lines: active.filter((p) => p.origin === 'KR').slice(0, 10).map((p) => ({ productId: p.id, qty: 72, unitCost: Math.round(p.cost * 0.7) })) },
    { id: 'sh5', supplier: 'NA Skincare Wholesale', origin: 'US', createdAt: daysAgoISO(9), status: 'in_transit', freight: 12400, customs: 0, lines: active.filter((p) => p.origin === 'US' || p.origin === 'CA').map((p) => ({ productId: p.id, qty: 40, unitCost: Math.round(p.cost * 0.7) })) },
    { id: 'sh6', supplier: 'Tokyo Cosme Export', origin: 'JP', createdAt: daysAgoISO(2), status: 'ordered', freight: 6200, customs: 0, lines: active.filter((p) => p.origin === 'JP').map((p) => ({ productId: p.id, qty: 60, unitCost: Math.round(p.cost * 0.7) })) },
  ]

  const staff: Staff[] = [
    { id: 's1', name: 'Karim Nabil', email: 'owner@nuri.example', role: 'owner', lastActive: new Date().toISOString() },
    { id: 's2', name: 'Reem Adel', email: 'reem@nuri.example', role: 'manager', lastActive: daysAgoISO(0, 10) },
    { id: 's3', name: 'Mostafa Hany', email: 'mostafa@nuri.example', role: 'fulfillment', lastActive: daysAgoISO(0, 11) },
    { id: 's4', name: 'Nada Samir', email: 'nada@nuri.example', role: 'support', lastActive: daysAgoISO(1, 18) },
    { id: 's5', name: 'Hassan Ali', email: 'hassan@nuri.example', role: 'marketing', lastActive: daysAgoISO(3, 14) },
  ]

  const activity: Activity[] = [
    { id: 'a1', at: daysAgoISO(0, 11), who: 'Mostafa Hany', what: { ar: 'جهّز 14 طلب للشحن مع بوسطة', en: 'Packed 14 orders for Bosta pickup' } },
    { id: 'a2', at: daysAgoISO(0, 10), who: 'Reem Adel', what: { ar: 'عدّلت سعر واقي بيوتي أوف جوسون', en: 'Updated price of Beauty of Joseon Relief Sun' } },
    { id: 'a3', at: daysAgoISO(1, 16), who: 'Hassan Ali', what: { ar: 'فعّل عرض واقي الشمس: التاني بنص التمن', en: 'Activated “Sunscreen: second at half price”' } },
    { id: 'a4', at: daysAgoISO(2, 13), who: 'Karim Nabil', what: { ar: 'استلم شحنة أوروبا (36 وحدة لكل صنف)', en: 'Received Europe shipment (36 units per SKU)' } },
  ]

  const settings: Settings = {
    storeName: { ar: 'نوري', en: 'NURI' },
    email: 'hello@nuri.example',
    phone: '+20 100 000 0000',
    whatsapp: '+20 100 000 0000',
    currency: 'EGP',
    taxIncluded: true,
    vatRate: 14,
    lowStockDefault: 10,
    expiryWarnDays: 90,
    codEnabled: true,
    codMax: 6000,
    autoConfirmWhatsapp: true,
    defaultLang: 'ar',
    announcement: {
      ar: 'شحن مجاني فوق 1500 ج.م في القاهرة والجيزة، والدفع عند الاستلام',
      en: 'Free shipping over EGP 1,500 in Cairo and Giza, cash on delivery available',
    },
  }

  return { products, customers, orders, reviews, discounts, abandoned, shipments, zones: ZONES, staff, activity, settings }
}
