import type { Category, Concern, Origin, Product, Shape, SkinType } from './types'
import { daysAgoISO, daysFromNowISO, rng } from '../lib/rand'

/*
  Demo catalog. Brands and product names are real products a K-beauty
  retailer would stock; prices, costs, stock, ratings and lots are synthetic
  demo values and must be replaced with the store's own data before launch.
*/

type Seed = {
  brand: string
  origin: Origin
  en: string
  ar: string
  shortEn: string
  shortAr: string
  category: Category
  step: Product['routineStep']
  time: ('am' | 'pm')[]
  skin: SkinType[]
  concerns: Concern[]
  ing: [string, string][]
  size: string
  price: number
  compareAt?: number
  shape: Shape
  body: string
  cap: string
  label?: string
  text?: string
  featured?: boolean
  tags?: string[]
}

const S: Seed[] = [
  {
    brand: 'COSRX', origin: 'KR', en: 'Advanced Snail 96 Mucin Power Essence', ar: 'إيسنس الحلزون 96 ميوسين',
    shortEn: 'Lightweight essence with 96% snail secretion filtrate that repairs and plumps.', shortAr: 'إيسنس خفيف بنسبة 96% من مستخلص الحلزون، يرمم البشرة ويمنحها امتلاءً.',
    category: 'essence', step: 3, time: ['am', 'pm'], skin: ['dry', 'normal', 'combination', 'sensitive'], concerns: ['hydration', 'barrier', 'aging'],
    ing: [['Snail Secretion Filtrate 96%', 'مستخلص الحلزون 96%'], ['Sodium Hyaluronate', 'هيالورونات الصوديوم'], ['Panthenol', 'بانثينول']],
    size: '100 ml', price: 890, compareAt: 990, shape: 'toner', body: '#d9d4c9', cap: '#2b2b2b', featured: true, tags: ['bestseller'],
  },
  {
    brand: 'Beauty of Joseon', origin: 'KR', en: 'Relief Sun: Rice + Probiotics SPF50+ PA++++', ar: 'واقي شمس الأرز والبروبيوتيك SPF50+',
    shortEn: 'Creamy organic sunscreen with rice extract. No white cast, no sting.', shortAr: 'واقي شمس كريمي بمستخلص الأرز، بدون أثر أبيض ولا لسعة.',
    category: 'sunscreen', step: 6, time: ['am'], skin: ['dry', 'normal', 'combination', 'sensitive'], concerns: ['sun', 'brightening'],
    ing: [['Rice Extract 30%', 'مستخلص الأرز 30%'], ['Grain Ferments', 'مخمرات الحبوب'], ['Niacinamide', 'نياسيناميد']],
    size: '50 ml', price: 780, shape: 'tube', body: '#efe6d2', cap: '#c9a46b', label: '#efe6d2', text: '#5a4a2e', featured: true, tags: ['bestseller'],
  },
  {
    brand: 'Beauty of Joseon', origin: 'KR', en: 'Glow Serum: Propolis + Niacinamide', ar: 'سيروم التوهج بالبروبوليس والنياسيناميد',
    shortEn: 'Honey-toned serum that calms breakouts and brings back glow.', shortAr: 'سيروم بلون العسل يهدّي الحبوب ويرجّع لمعة البشرة.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['oily', 'combination', 'normal'], concerns: ['acne', 'brightening', 'pores'],
    ing: [['Propolis Extract 60%', 'مستخلص البروبوليس 60%'], ['Niacinamide 2%', 'نياسيناميد 2%'], ['Tea Tree', 'شجرة الشاي']],
    size: '30 ml', price: 820, shape: 'dropper', body: '#c98a2c', cap: '#1f1f1f', label: '#f3e6c9', text: '#5b3b0e',
  },
  {
    brand: 'Anua', origin: 'KR', en: 'Heartleaf 77% Soothing Toner', ar: 'تونر هارت ليف 77% المهدئ',
    shortEn: 'pH-balanced toner that calms redness and visible irritation.', shortAr: 'تونر متوازن الحموضة يهدّي الاحمرار والتهيّج الظاهر.',
    category: 'toner', step: 2, time: ['am', 'pm'], skin: ['sensitive', 'oily', 'combination'], concerns: ['redness', 'acne', 'barrier'],
    ing: [['Heartleaf Extract 77%', 'مستخلص هارت ليف 77%'], ['Panthenol', 'بانثينول'], ['Betaine', 'بيتايين']],
    size: '250 ml', price: 950, shape: 'toner', body: '#e6efe2', cap: '#7fa27a', label: '#f8faf5', text: '#3b5a36', featured: true, tags: ['bestseller'],
  },
  {
    brand: 'Round Lab', origin: 'KR', en: '1025 Dokdo Toner', ar: 'تونر دوكدو 1025',
    shortEn: 'Gentle exfoliating toner with deep-sea water from Ulleungdo.', shortAr: 'تونر مقشّر لطيف بمياه البحر العميق من جزيرة أولونغدو.',
    category: 'toner', step: 2, time: ['am', 'pm'], skin: ['normal', 'combination', 'dry', 'sensitive'], concerns: ['hydration', 'pores'],
    ing: [['Deep Sea Water', 'مياه البحر العميق'], ['Betaine Salicylate', 'ساليسيلات البيتايين'], ['Panthenol', 'بانثينول']],
    size: '200 ml', price: 840, shape: 'toner', body: '#e3edf3', cap: '#2f5f8a', label: '#ffffff', text: '#2f5f8a',
  },
  {
    brand: 'Torriden', origin: 'KR', en: 'DIVE-IN Low Molecular Hyaluronic Acid Serum', ar: 'سيروم دايف إن بالهيالورونيك منخفض الجزيئات',
    shortEn: 'Five sizes of hyaluronic acid for water-deep hydration.', shortAr: 'خمسة أحجام من الهيالورونيك لترطيب يوصل لعمق البشرة.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['dry', 'normal', 'combination', 'sensitive', 'oily'], concerns: ['hydration', 'barrier'],
    ing: [['5D Hyaluronic Acid', 'هيالورونيك خماسي'], ['D-Panthenol', 'دي-بانثينول'], ['Allantoin', 'ألانتوين']],
    size: '50 ml', price: 870, shape: 'dropper', body: '#cfe3f2', cap: '#e9eef2', label: '#ffffff', text: '#2c6fa6', featured: true,
  },
  {
    brand: 'Laneige', origin: 'KR', en: 'Water Sleeping Mask', ar: 'ماسك النوم المائي',
    shortEn: 'Overnight gel mask that wakes skin up rested and bouncy.', shortAr: 'ماسك جل ليلي يصحّي بشرتك مرتاحة ومشدودة.',
    category: 'mask', step: 4, time: ['pm'], skin: ['dry', 'normal', 'combination'], concerns: ['hydration', 'brightening'],
    ing: [['Squalane', 'سكوالين'], ['Probiotic-derived Complex', 'مركّب البروبيوتيك'], ['Hydro Ionized Mineral Water', 'مياه معدنية']],
    size: '70 ml', price: 1450, compareAt: 1650, shape: 'jar', body: '#6f86c9', cap: '#c9d3ef', label: '#6f86c9', text: '#ffffff',
  },
  {
    brand: 'Laneige', origin: 'KR', en: 'Lip Sleeping Mask Berry', ar: 'ماسك الشفايف الليلي بالتوت',
    shortEn: 'The cult overnight lip balm. Soft lips by morning.', shortAr: 'بلسم الشفايف الليلي الأشهر. شفايف ناعمة الصبح.',
    category: 'lip', step: 5, time: ['pm'], skin: ['dry', 'normal', 'combination', 'sensitive', 'oily'], concerns: ['hydration'],
    ing: [['Berry Mix Complex', 'مركّب التوت'], ['Shea Butter', 'زبدة الشيا'], ['Vitamin C', 'فيتامين سي']],
    size: '20 g', price: 760, shape: 'jar', body: '#e7a2b4', cap: '#f6d5de', label: '#e7a2b4', text: '#ffffff', tags: ['gift'],
  },
  {
    brand: 'Sulwhasoo', origin: 'KR', en: 'First Care Activating Serum', ar: 'سيروم العناية الأولى المنشّط',
    shortEn: 'Ginseng-led first serum that preps skin for everything after it.', shortAr: 'سيروم أول خطوة بالجينسنغ يجهّز البشرة لكل اللي بعده.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['dry', 'normal', 'combination'], concerns: ['aging', 'barrier', 'brightening'],
    ing: [['JAUM Activator', 'منشّط جاوم'], ['Ginseng', 'جينسنغ'], ['Peony', 'الفاوانيا']],
    size: '60 ml', price: 4200, shape: 'pump', body: '#b8862f', cap: '#2a2016', label: '#b8862f', text: '#2a2016', featured: true, tags: ['luxury'],
  },
  {
    brand: 'Innisfree', origin: 'KR', en: 'Green Tea Seed Hyaluronic Serum', ar: 'سيروم بذور الشاي الأخضر بالهيالورونيك',
    shortEn: 'Jeju green tea and hyaluronic acid for a fresh, dewy finish.', shortAr: 'شاي جيجو الأخضر والهيالورونيك لملمس ندي ومنعش.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['combination', 'normal', 'oily'], concerns: ['hydration'],
    ing: [['Green Tea Seed Oil', 'زيت بذور الشاي الأخضر'], ['Hyaluronic Acid', 'هيالورونيك'], ['Green Tea Water', 'ماء الشاي الأخضر']],
    size: '80 ml', price: 1150, shape: 'pump', body: '#3f7d55', cap: '#e8efe9', label: '#3f7d55', text: '#ffffff',
  },
  {
    brand: 'SKIN1004', origin: 'KR', en: 'Madagascar Centella Ampoule', ar: 'أمبول السنتيلا من مدغشقر',
    shortEn: '100% centella extract. One ingredient, calmer skin.', shortAr: 'مستخلص سنتيلا 100%. مكوّن واحد وبشرة أهدى.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['sensitive', 'oily', 'combination', 'normal'], concerns: ['redness', 'acne', 'barrier'],
    ing: [['Centella Asiatica Extract 100%', 'مستخلص السنتيلا 100%']],
    size: '55 ml', price: 690, shape: 'dropper', body: '#d8c8a8', cap: '#3c3c3c', label: '#f5efe2', text: '#3a4a2e', tags: ['bestseller'],
  },
  {
    brand: 'SOME BY MI', origin: 'KR', en: 'AHA BHA PHA 30 Days Miracle Toner', ar: 'تونر المعجزة 30 يوم AHA BHA PHA',
    shortEn: 'Triple-acid toner for clearer pores in a month.', shortAr: 'تونر بثلاث أحماض لمسام أنظف خلال شهر.',
    category: 'toner', step: 2, time: ['pm'], skin: ['oily', 'combination'], concerns: ['acne', 'pores'],
    ing: [['Tea Tree 10,000ppm', 'شجرة الشاي'], ['AHA BHA PHA', 'أحماض AHA BHA PHA'], ['Niacinamide', 'نياسيناميد']],
    size: '150 ml', price: 720, shape: 'toner', body: '#d3ebe0', cap: '#2e8a5f', label: '#ffffff', text: '#2e8a5f',
  },
  {
    brand: 'Isntree', origin: 'KR', en: 'Hyaluronic Acid Watery Sun Gel SPF50+', ar: 'جل واقي الشمس المائي بالهيالورونيك SPF50+',
    shortEn: 'Water-light sun gel that layers under makeup.', shortAr: 'جل واقي شمس خفيف زي المية، يمشي تحت المكياج.',
    category: 'sunscreen', step: 6, time: ['am'], skin: ['oily', 'combination', 'normal'], concerns: ['sun', 'hydration'],
    ing: [['8 Hyaluronic Acids', '8 أنواع هيالورونيك'], ['Centella', 'سنتيلا']],
    size: '50 ml', price: 690, shape: 'tube', body: '#d6e9f5', cap: '#ffffff', label: '#d6e9f5', text: '#24658f',
  },
  {
    brand: 'medicube', origin: 'KR', en: 'Zero Pore Pad 2.0', ar: 'باد زيرو بور 2.0',
    shortEn: 'Dual-texture pads that resurface and tighten the look of pores.', shortAr: 'باد بوجهين يقشّر ويقلّل مظهر المسام.',
    category: 'toner', step: 2, time: ['pm'], skin: ['oily', 'combination'], concerns: ['pores', 'acne'],
    ing: [['AHA 4.5%', 'AHA 4.5%'], ['BHA 0.45%', 'BHA 0.45%'], ['Willow Bark', 'لحاء الصفصاف']],
    size: '70 pads', price: 1100, shape: 'pad', body: '#f2d7de', cap: '#d65a7a', label: '#ffffff', text: '#b23c5d',
  },
  {
    brand: 'Dr.Jart+', origin: 'KR', en: 'Cicapair Tiger Grass Color Correcting Treatment', ar: 'كريم سيكاپير المصحّح للون',
    shortEn: 'Green-to-beige SPF treatment that neutralises redness.', shortAr: 'كريم أخضر يتحوّل لبيج ويخفي الاحمرار مع حماية.',
    category: 'moisturizer', step: 5, time: ['am'], skin: ['sensitive', 'combination', 'normal'], concerns: ['redness', 'sun'],
    ing: [['Centella Asiatica', 'سنتيلا'], ['Encapsulated Pigments', 'صبغات مغلّفة']],
    size: '50 ml', price: 1950, shape: 'jar', body: '#4f7a5a', cap: '#2b3b2f', label: '#4f7a5a', text: '#e8efe9',
  },
  {
    brand: 'MISSHA', origin: 'KR', en: 'Time Revolution The First Treatment Essence', ar: 'إيسنس تايم ريفولوشن الأول',
    shortEn: 'Fermented yeast essence for brighter, smoother skin texture.', shortAr: 'إيسنس خميرة مخمّرة لبشرة أنعم وأفتح.',
    category: 'essence', step: 3, time: ['am', 'pm'], skin: ['dry', 'normal', 'combination'], concerns: ['brightening', 'aging'],
    ing: [['Saccharomyces Ferment 97%', 'خميرة مخمّرة 97%'], ['Niacinamide', 'نياسيناميد']],
    size: '150 ml', price: 1350, shape: 'toner', body: '#d4c39a', cap: '#c9a85a', label: '#f3ecdc', text: '#6b5320',
  },
  {
    brand: 'BANILA CO', origin: 'KR', en: 'Clean It Zero Cleansing Balm Original', ar: 'بلسم كلين إت زيرو المنظّف',
    shortEn: 'Sherbet balm that melts sunscreen and makeup in one pass.', shortAr: 'بلسم يدوب واقي الشمس والمكياج من أول مسحة.',
    category: 'cleanser', step: 1, time: ['pm'], skin: ['normal', 'dry', 'combination'], concerns: ['pores'],
    ing: [['Acerola', 'أسيرولا'], ['Papaya Extract', 'مستخلص البابايا'], ['Vitamin C', 'فيتامين سي']],
    size: '100 ml', price: 980, shape: 'jar', body: '#f1b7c6', cap: '#e4879f', label: '#f1b7c6', text: '#8a2f48', tags: ['bestseller'],
  },
  {
    brand: 'COSRX', origin: 'KR', en: 'Low pH Good Morning Gel Cleanser', ar: 'غسول الصباح منخفض الحموضة',
    shortEn: 'Mild gel cleanser with tea tree and BHA. Clean without tightness.', shortAr: 'غسول جل لطيف بشجرة الشاي وBHA. ينضّف من غير شد.',
    category: 'cleanser', step: 1, time: ['am'], skin: ['oily', 'combination', 'normal', 'sensitive'], concerns: ['acne', 'pores'],
    ing: [['Tea Tree Oil', 'زيت شجرة الشاي'], ['Betaine Salicylate', 'ساليسيلات البيتايين']],
    size: '150 ml', price: 520, shape: 'tube', body: '#e9f1df', cap: '#3d6b3a', label: '#e9f1df', text: '#3d6b3a',
  },
  {
    brand: 'Mediheal', origin: 'KR', en: 'Teatree Essential Mask (10 sheets)', ar: 'ماسك شجرة الشاي (10 شيتات)',
    shortEn: 'Ten soothing sheet masks for breakout-prone days.', shortAr: 'عشرة ماسكات شيت مهدّية لأيام الحبوب.',
    category: 'mask', step: 4, time: ['pm'], skin: ['oily', 'combination', 'sensitive'], concerns: ['acne', 'redness'],
    ing: [['Tea Tree Leaf Water', 'ماء أوراق شجرة الشاي'], ['Centella', 'سنتيلا']],
    size: '10 × 24 ml', price: 650, shape: 'mask', body: '#8fbf9b', cap: '#ffffff', label: '#8fbf9b', text: '#1f4a2c',
  },
  {
    brand: 'Klairs', origin: 'KR', en: 'Supple Preparation Unscented Toner', ar: 'تونر سابل بريباريشن بدون عطر',
    shortEn: 'Fragrance-free hydrating toner for reactive skin.', shortAr: 'تونر مرطّب بدون عطر للبشرة الحساسة.',
    category: 'toner', step: 2, time: ['am', 'pm'], skin: ['sensitive', 'dry', 'normal'], concerns: ['hydration', 'barrier', 'redness'],
    ing: [['Sodium Hyaluronate', 'هيالورونات الصوديوم'], ['Beta-Glucan', 'بيتا جلوكان'], ['Centella', 'سنتيلا']],
    size: '180 ml', price: 890, shape: 'toner', body: '#f4f4f1', cap: '#9aa39b', label: '#f4f4f1', text: '#4c5a4f',
  },
  {
    brand: 'Abib', origin: 'KR', en: 'Mild Acidic pH Sheet Mask Heartleaf Fit', ar: 'ماسك أبيب هارت ليف الحامضي اللطيف',
    shortEn: 'Low-pH sheet mask that calms in fifteen minutes.', shortAr: 'ماسك شيت منخفض الحموضة يهدّي البشرة في ربع ساعة.',
    category: 'mask', step: 4, time: ['pm'], skin: ['sensitive', 'oily', 'combination'], concerns: ['redness', 'barrier'],
    ing: [['Heartleaf Extract', 'مستخلص هارت ليف'], ['Panthenol', 'بانثينول']],
    size: '30 ml', price: 120, shape: 'mask', body: '#cfd8c8', cap: '#ffffff', label: '#cfd8c8', text: '#3a4634',
  },
  {
    brand: 'CLIO', origin: 'KR', en: 'Kill Cover Fixer Cushion', ar: 'كوشن كيل كفر فيكسر',
    shortEn: 'Full-coverage cushion that holds through a Cairo summer day.', shortAr: 'كوشن تغطية كاملة يثبت يوم صيف كامل في القاهرة.',
    category: 'makeup', step: 6, time: ['am'], skin: ['oily', 'combination', 'normal'], concerns: ['sun'],
    ing: [['Fixing Powder', 'بودرة مثبّتة'], ['SPF50+ PA+++', 'حماية SPF50+']],
    size: '15 g × 2', price: 1250, shape: 'cushion', body: '#1d1d1f', cap: '#c7a76c', label: '#1d1d1f', text: '#c7a76c',
  },
  {
    brand: 'HERA', origin: 'KR', en: 'Black Cushion SPF34', ar: 'هيرا بلاك كوشن SPF34',
    shortEn: 'Seoul’s quiet-luxury cushion. Satin-matte, skin-like finish.', shortAr: 'كوشن الفخامة الهادئة من سيول. لمسة مطفية زي البشرة.',
    category: 'makeup', step: 6, time: ['am'], skin: ['normal', 'combination', 'oily'], concerns: ['sun'],
    ing: [['Micro Pigments', 'صبغات دقيقة'], ['Camellia Water', 'ماء الكاميليا']],
    size: '15 g × 2', price: 2600, shape: 'cushion', body: '#111111', cap: '#3a3a3a', label: '#111111', text: '#d9d9d9', tags: ['luxury'],
  },
  {
    brand: 'rom&nd', origin: 'KR', en: 'Juicy Lasting Tint', ar: 'تينت جوسي لاستنج',
    shortEn: 'Glassy, juicy lip tint that stains and stays.', shortAr: 'تينت شفايف لامع وعصيري بيثبت لون.',
    category: 'lip', step: 6, time: ['am'], skin: ['normal', 'dry', 'oily', 'combination', 'sensitive'], concerns: [],
    ing: [['Fruit Extracts', 'مستخلصات فواكه'], ['Moisture Coating', 'طبقة ترطيب']],
    size: '5.5 g', price: 520, shape: 'tint', body: '#c2384a', cap: '#f4f1ef', label: '#c2384a', text: '#ffffff', tags: ['gift'],
  },
  {
    brand: 'The Ordinary', origin: 'CA', en: 'Niacinamide 10% + Zinc 1%', ar: 'نياسيناميد 10% + زنك 1%',
    shortEn: 'High-strength serum for blemishes and visible shine.', shortAr: 'سيروم مركّز للبقع ولمعة البشرة الدهنية.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['oily', 'combination'], concerns: ['acne', 'pores', 'brightening'],
    ing: [['Niacinamide 10%', 'نياسيناميد 10%'], ['Zinc PCA 1%', 'زنك 1%']],
    size: '30 ml', price: 540, shape: 'dropper', body: '#e9e6df', cap: '#1a1a1a', label: '#ffffff', text: '#1a1a1a', tags: ['bestseller'],
  },
  {
    brand: 'The Ordinary', origin: 'CA', en: 'Hyaluronic Acid 2% + B5', ar: 'هيالورونيك أسيد 2% + B5',
    shortEn: 'Multi-depth hydration serum with vitamin B5.', shortAr: 'سيروم ترطيب متعدد الطبقات بفيتامين B5.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['dry', 'normal', 'combination', 'oily', 'sensitive'], concerns: ['hydration'],
    ing: [['Hyaluronic Acid 2%', 'هيالورونيك 2%'], ['Panthenol (B5)', 'بانثينول B5']],
    size: '30 ml', price: 560, shape: 'dropper', body: '#e9e6df', cap: '#1a1a1a', label: '#ffffff', text: '#1a1a1a',
  },
  {
    brand: 'CeraVe', origin: 'US', en: 'Moisturising Cream', ar: 'كريم سيرافي المرطّب',
    shortEn: 'Three essential ceramides to restore the skin barrier.', shortAr: 'ثلاث سيراميدات أساسية لترميم حاجز البشرة.',
    category: 'moisturizer', step: 5, time: ['am', 'pm'], skin: ['dry', 'normal', 'sensitive'], concerns: ['barrier', 'hydration'],
    ing: [['Ceramides 1, 3, 6-II', 'سيراميد 1، 3، 6'], ['Hyaluronic Acid', 'هيالورونيك'], ['MVE Technology', 'تقنية MVE']],
    size: '340 g', price: 980, shape: 'jar', body: '#f7f8fa', cap: '#2f6db3', label: '#f7f8fa', text: '#2f6db3', tags: ['bestseller'],
  },
  {
    brand: 'CeraVe', origin: 'US', en: 'Hydrating Facial Cleanser', ar: 'غسول سيرافي المرطّب',
    shortEn: 'Non-foaming cleanser that respects a dry, tight skin barrier.', shortAr: 'غسول بدون رغوة يحافظ على حاجز البشرة الجافة.',
    category: 'cleanser', step: 1, time: ['am', 'pm'], skin: ['dry', 'normal', 'sensitive'], concerns: ['barrier', 'hydration'],
    ing: [['Ceramides', 'سيراميدات'], ['Hyaluronic Acid', 'هيالورونيك']],
    size: '236 ml', price: 760, shape: 'pump', body: '#f7f8fa', cap: '#2f6db3', label: '#f7f8fa', text: '#2f6db3',
  },
  {
    brand: 'La Roche-Posay', origin: 'FR', en: 'Anthelios UVMune 400 Invisible Fluid SPF50+', ar: 'أنثيليوس يو في ميون 400 فلويد SPF50+',
    shortEn: 'Ultra-long UVA protection in an invisible fluid.', shortAr: 'حماية طويلة من UVA في فلويد غير مرئي.',
    category: 'sunscreen', step: 6, time: ['am'], skin: ['sensitive', 'normal', 'combination', 'oily', 'dry'], concerns: ['sun'],
    ing: [['Mexoryl 400', 'ميكسوريل 400'], ['La Roche-Posay Thermal Water', 'مياه لاروش بوزيه الحرارية']],
    size: '50 ml', price: 1290, shape: 'tube', body: '#f4f6f8', cap: '#f0a33a', label: '#f4f6f8', text: '#1e5a96',
  },
  {
    brand: 'La Roche-Posay', origin: 'FR', en: 'Effaclar Duo+M', ar: 'إيفاكلار ديو+M',
    shortEn: 'Targets breakouts and the marks they leave behind.', shortAr: 'بيعالج الحبوب والآثار اللي بتسيبها.',
    category: 'moisturizer', step: 5, time: ['am', 'pm'], skin: ['oily', 'combination'], concerns: ['acne', 'pores'],
    ing: [['Niacinamide', 'نياسيناميد'], ['Phylobioma', 'فيلوبيوما'], ['Salicylic Acid', 'حمض الساليسيليك']],
    size: '40 ml', price: 1150, shape: 'tube', body: '#ffffff', cap: '#1e5a96', label: '#ffffff', text: '#1e5a96',
  },
  {
    brand: 'Bioderma', origin: 'FR', en: 'Sensibio H2O Micellar Water', ar: 'مياه ميسيلار سنسيبيو H2O',
    shortEn: 'The original micellar water for sensitive skin.', shortAr: 'مياه الميسيلار الأصلية للبشرة الحساسة.',
    category: 'cleanser', step: 1, time: ['am', 'pm'], skin: ['sensitive', 'dry', 'normal', 'combination'], concerns: ['redness'],
    ing: [['Micelles', 'ميسيلات'], ['Cucumber Extract', 'مستخلص الخيار']],
    size: '500 ml', price: 890, shape: 'toner', body: '#f6f0f2', cap: '#e38aa4', label: '#ffffff', text: '#c2577a',
  },
  {
    brand: 'Vichy', origin: 'FR', en: 'Minéral 89 Hyaluronic Acid Booster', ar: 'معزّز مينيرال 89 بالهيالورونيك',
    shortEn: 'Volcanic mineral water and hyaluronic acid for daily strength.', shortAr: 'مياه بركانية وهيالورونيك لبشرة أقوى يوميًا.',
    category: 'serum', step: 3, time: ['am', 'pm'], skin: ['sensitive', 'dry', 'normal', 'combination', 'oily'], concerns: ['hydration', 'barrier'],
    ing: [['Vichy Volcanic Water 89%', 'مياه فيشي البركانية 89%'], ['Hyaluronic Acid', 'هيالورونيك']],
    size: '50 ml', price: 1390, shape: 'dropper', body: '#e9ecef', cap: '#2b2f33', label: '#ffffff', text: '#2b2f33',
  },
  {
    brand: 'Avène', origin: 'FR', en: 'Cicalfate+ Restorative Protective Cream', ar: 'كريم سيكالفات+ المرمّم',
    shortEn: 'Repairs irritated skin and visibly reduces marks.', shortAr: 'بيرمّم البشرة المتهيّجة ويقلّل الآثار.',
    category: 'moisturizer', step: 5, time: ['pm'], skin: ['sensitive', 'dry', 'normal'], concerns: ['barrier', 'redness'],
    ing: [['C+-Restore', 'سي ريستور'], ['Copper-Zinc Sulfate', 'كبريتات النحاس والزنك']],
    size: '40 ml', price: 760, shape: 'tube', body: '#ffffff', cap: '#d43b3b', label: '#ffffff', text: '#d43b3b',
  },
  {
    brand: 'Bioré', origin: 'JP', en: 'UV Aqua Rich Watery Essence SPF50+', ar: 'بيوريه يو في أكوا ريتش إيسنس SPF50+',
    shortEn: 'Japan’s weightless watery sunscreen.', shortAr: 'واقي الشمس الياباني الخفيف زي المية.',
    category: 'sunscreen', step: 6, time: ['am'], skin: ['oily', 'combination', 'normal'], concerns: ['sun'],
    ing: [['Micro Defense', 'مايكرو ديفنس'], ['Hyaluronic Acid', 'هيالورونيك']],
    size: '70 g', price: 690, shape: 'tube', body: '#2c74c8', cap: '#ffffff', label: '#2c74c8', text: '#ffffff',
  },
  {
    brand: 'Paula’s Choice', origin: 'US', en: 'Skin Perfecting 2% BHA Liquid Exfoliant', ar: 'مقشّر BHA 2% السائل',
    shortEn: 'Leave-on exfoliant that unclogs pores and smooths texture.', shortAr: 'مقشّر سائل بيفتح المسام وينعّم ملمس البشرة.',
    category: 'toner', step: 2, time: ['pm'], skin: ['oily', 'combination', 'normal'], concerns: ['pores', 'acne'],
    ing: [['Salicylic Acid 2%', 'حمض الساليسيليك 2%'], ['Green Tea', 'شاي أخضر']],
    size: '118 ml', price: 1650, shape: 'toner', body: '#ffffff', cap: '#2a2a2a', label: '#ffffff', text: '#7a3a8a',
  },
  {
    brand: 'Eucerin', origin: 'DE', en: 'Hyaluron-Filler Night Cream', ar: 'كريم الليل هيالورون فيلر',
    shortEn: 'Rich night cream that visibly fills fine lines.', shortAr: 'كريم ليلي غني يملأ الخطوط الرفيعة.',
    category: 'moisturizer', step: 5, time: ['pm'], skin: ['dry', 'normal'], concerns: ['aging', 'hydration'],
    ing: [['Hyaluronic Acid', 'هيالورونيك'], ['Saponin', 'سابونين']],
    size: '50 ml', price: 1590, shape: 'jar', body: '#f5f1f6', cap: '#7b4a8c', label: '#f5f1f6', text: '#7b4a8c',
  },
]

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[’'+%:.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

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


export function buildCatalog(): Product[] {
  const r = rng(20261011)
  return S.map((s, i) => {
    const id = `p${String(i + 1).padStart(3, '0')}`
    const cost = Math.round(s.price * (0.42 + r() * 0.16))
    const lowStockAt = s.price > 2000 ? 4 : 10
    const nBatches = 1 + Math.floor(r() * 3)
    const batches = Array.from({ length: nBatches }, (_, b) => {
      // Some lots expire soon on purpose so the admin has something to act on.
      const expDays = b === 0 && r() < 0.28 ? 20 + Math.floor(r() * 70) : 180 + Math.floor(r() * 600)
      return {
        id: `${id}-b${b + 1}`,
        lot: `${s.origin}${(24 + b).toString()}${String(Math.floor(r() * 9000) + 1000)}`,
        qty: Math.max(0, Math.floor(r() * (s.price > 2000 ? 14 : 60)) - (b === 0 && r() < 0.2 ? 40 : 0)),
        expiry: daysFromNowISO(expDays),
        receivedAt: daysAgoISO(30 + Math.floor(r() * 200)),
        shipmentId: `sh${(i % 6) + 1}`,
      }
    })
    const [howEn, howAr] = CAT_DESC[s.category]
    return {
      id,
      slug: slugify(`${s.brand} ${s.en}`),
      sku: `NR-${s.brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      barcode: `880${String(Math.floor(r() * 1e10)).padStart(10, '0')}`,
      brand: s.brand,
      origin: s.origin,
      name: { ar: s.ar, en: s.en },
      short: { ar: s.shortAr, en: s.shortEn },
      description: {
        en: `${s.shortEn} Imported directly from ${originName(s.origin).en} through Bright’s authorised supply chain; every unit carries its lot number and expiry date.`,
        ar: `${s.shortAr} مستورد مباشرة من ${originName(s.origin).ar} عن طريق سلسلة توريد برايت المعتمدة، وكل عبوة عليها رقم التشغيلة وتاريخ الصلاحية.`,
      },
      howToUse: { en: howEn, ar: howAr },
      category: s.category,
      routineStep: s.step,
      routineTime: s.time,
      skinTypes: s.skin,
      concerns: s.concerns,
      ingredients: s.ing.map(([en, ar]) => ({ en, ar })),
      size: s.size,
      price: s.price,
      compareAt: s.compareAt,
      cost,
      batches,
      lowStockAt,
      visual: {
        shape: s.shape,
        body: s.body,
        cap: s.cap,
        label: s.label ?? '#ffffff',
        text: s.text ?? '#222222',
      },
      rating: Math.round((4.2 + r() * 0.75) * 10) / 10,
      reviewCount: 12 + Math.floor(r() * 420),
      tags: s.tags ?? [],
      status: i === S.length - 1 ? 'draft' : 'active',
      createdAt: daysAgoISO(60 + Math.floor(r() * 300)),
      featured: s.featured,
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
