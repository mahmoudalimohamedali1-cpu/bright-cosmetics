import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { Hero } from '../components/Hero'
import { INTRO_HOLD_MS, Preloader, useIntro } from '../components/home/Preloader'
import { ProductCard } from '../components/ProductCard'
import { Accordion } from '../components/home/Accordion'
import { AuthSeal, BurstBadge, Pill } from '../components/home/Glyphs'
import { Marquee } from '../components/home/Marquee'
import { ScrollFillHeading } from '../components/home/ScrollFillHeading'
import { SpinBand } from '../components/home/SpinBand'
import { Testimonials } from '../components/home/Testimonials'
import { WildStrip } from '../components/home/WildStrip'
import { PHOTOS } from '../media'
import type { Photo } from '../media'
import { useActiveProducts, useTitle } from '../lib'
import '../home.css'

function Img({ ph, w, h, sizes, className }: { ph: Photo; w: number; h: number; sizes: string; className?: string }) {
  const { lang } = useI18n()
  const widths = [0.5, 1, 1.5].map((k) => Math.round(w * k))
  return (
    <img
      className={className}
      src={ph.src(w, h)}
      srcSet={widths.map((x) => `${ph.src(x, Math.round((x * h) / w))} ${x}w`).join(', ')}
      sizes={sizes}
      width={w}
      height={h}
      alt={ph.alt[lang]}
      loading="lazy"
      decoding="async"
    />
  )
}

export default function Home() {
  const { tx } = useI18n()
  useTitle(undefined)
  const intro = useIntro()
  // Decided once at mount: the hero waits only if the sheet is up when it first renders
  const [introHold] = useState(() => (intro === 'draw' ? INTRO_HOLD_MS : 0))
  const products = useActiveProducts()
  const best = useMemo(() => [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8), [products])
  const star = best[0]
  // The spin band wants a chunky silhouette; fall back to the top seller.
  const spinner = best.find((p) => ['toner', 'pump', 'jar', 'tube'].includes(p.visual.shape)) ?? star

  const promises = [
    {
      title: tx('تشغيلة أصلية، مكتوبة على كل عبوة', 'Authentic lots, on every unit'),
      body: tx(
        'كل عبوة عليها رقم التشغيلة وتاريخ الانتهاء، وتقدري تشوفيهم في صفحة المنتج قبل ما تطلبي. وبنشحن الأقرب في الانتهاء الأول، عشان مفيش حاجة تقعد على الرف.',
        'Every unit carries its lot number and expiry, and you can see both on the product page before you order. We ship the earliest-expiring lot first, so nothing sits on a shelf.',
      ),
    },
    {
      title: tx('على قد بشرتك', 'Matched to your skin'),
      body: tx(
        'فلتري بنوع بشرتك واللي مضايقك: حبوب، جفاف، بقع، مسام. ولو مش متأكدة، اختبار الروتين في أربع أسئلة بيرشّحلك منتج لكل خطوة.',
        'Filter by skin type and concern: breakouts, dryness, dark spots, pores. Not sure? The four-question routine quiz picks one product for every step.',
      ),
    },
    {
      title: tx('الدفع عند الاستلام في كل مصر', 'Cash on delivery across Egypt'),
      body: tx(
        'بنأكّد الطلب معاكي على واتساب، وبيوصلك مع شركة شحن لحد الباب في كل المحافظات. تفتحي وتتأكدي وبعدين تدفعي.',
        'We confirm your order on WhatsApp, then a courier brings it to your door in every governorate. Check it, then pay.',
      ),
    },
    {
      title: tx('كوري ومستورد، في مكان واحد', 'Korean + imported'),
      body: tx(
        'أشهر ماركات الكي بيوتي جنب ماركات الصيدليات الفرنساوي، من موزّعين معتمدين بس.',
        'Cult K-beauty next to French pharmacy staples, only ever from authorised suppliers.',
      ),
    },
  ]

  const routines = [
    { ph: PHOTOS.centellaHand, title: tx('روتين البشرة الحساسة', 'Calm routine'), to: '/shop?skin=sensitive', isNew: true },
    { ph: PHOTOS.serumsPink, title: tx('روتين التوهّج', 'Glow routine'), to: '/shop?concern=brightening' },
    { ph: PHOTOS.amber, title: tx('روتين الحبوب', 'Clear routine'), to: '/shop?concern=acne' },
  ]

  return (
    <div className="v-home">
      <Preloader phase={intro} />
      <Hero hold={introHold} />

      {/* Heading fill + bestsellers */}
      <section className="v-best" aria-labelledby="v-best-h">
        <div className="v-wrap">
          <ScrollFillHeading
            id="v-best-h"
            className="v-best__h"
            text={tx('الأكتر مبيعًا عندنا، وكل عبوة برقم تشغيلتها.', 'Our bestsellers, every bottle with its lot number.')}
          />
        </div>
        <ul className="v-grid" aria-label={tx('الأكثر مبيعًا', 'Bestsellers')}>
          {best.map((p) => (
            <li key={p.id} className="v-grid__cell">
              <ProductCard p={p} />
            </li>
          ))}
        </ul>
        <div className="v-center">
          <Pill to="/shop?sort=best">{tx('شوفي الكل', 'See all')}</Pill>
        </div>
      </section>

      {/* Photo + accordion */}
      <section className="v-why" aria-labelledby="v-why-h">
        <div className="v-wrap v-why__grid">
          <div className="v-why__photo">
            <Img ph={PHOTOS.serum} w={720} h={800} sizes="(max-width: 860px) 100vw, 50vw" />
          </div>
          <div className="v-why__copy">
            <h2 id="v-why-h" className="v-h2">{tx('كل اللي محتاجاه بشرتك. ولا حاجة زيادة.', "Everything your skin wants. Nothing it doesn't.")}</h2>
            <Accordion items={promises} />
          </div>
        </div>
      </section>

      <Testimonials />

      <Marquee
        className="v-strip"
        items={[tx('أصلي، مش تقليد', 'Authentic, never knock-off')]}
        label={tx('وعد نوري', 'The NURI promise')}
        repeat={8}
        speed={30}
      />

      {/* Spin band + banner */}
      {spinner && <SpinBand product={spinner} />}
      <div className="v-wrap">
        <div className="v-banner">
          <Img ph={PHOTOS.banner} w={1400} h={620} sizes="100vw" />
        </div>
      </div>

      {/* Lot record */}
      {star && (
        <section className="v-lot" aria-labelledby="v-lot-h">
          <div className="v-wrap v-lot__grid">
            <div className="v-lot__art">
              <AuthSeal className="v-seal" />
            </div>
            <div className="v-lot__copy">
              <h2 id="v-lot-h" className="v-h2">{tx('كل عبوة ليها سجل: من سيول لحد باب بيتك.', 'Every unit has a record: from Seoul to your door.')}</h2>
              <p className="v-mono">
                {tx(
                  'جاية منين، وصلت إمتى، وصالحة لحد إمتى. السجل ده موجود في صفحة كل منتج، قبل ما تدفعي جنيه.',
                  'Where it came from, when it landed, how long it is good for. The record sits on every product page, before you pay a pound.',
                )}
              </p>
              <Pill to={`/p/${star.slug}`}>{tx('اعرفي أكتر', 'See a record')}</Pill>
            </div>
          </div>
        </section>
      )}

      {/* Routines */}
      <section className="v-routines" aria-labelledby="v-routines-h">
        <div className="v-wrap">
          <h2 id="v-routines-h" className="v-h2 v-routines__h">{tx('روتينات.', 'Routines.')}</h2>
          <ul className="v-routines__grid">
            {routines.map((r) => (
              <li key={r.to}>
                <Link to={r.to} className="v-rcard">
                  <span className="v-rcard__ph">
                    <Img ph={r.ph} w={600} h={460} sizes="(max-width: 760px) 100vw, 33vw" />
                    {r.isNew && <BurstBadge className="v-rcard__badge">{tx('جديد', 'New')}</BurstBadge>}
                  </span>
                  <span className="v-rcard__t">{r.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <WildStrip />
    </div>
  )
}
