import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Heart, Minus, Moon, Plus, Sun, Truck } from 'lucide-react'
import { CATEGORY_LABEL, CONCERN_LABEL, SKIN_LABEL, STEP_LABEL, originName } from '../../data/catalog'
import { GOVERNORATES } from '../../data/seed'
import type { SkinType } from '../../data/types'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stockOf, useProduct, useStore, zoneFor } from '../../store'
import { PHOTOS } from '../media'
import type { Photo } from '../media'
import { ProductPanes } from '../components/ProductCard'
import { Provenance } from '../components/Provenance'
import { Arrow, Price, Stars, Stepper } from '../components/bits'
import { brandSlug, fefoBatch, stepCategoryOk, useActiveProducts, useTitle } from '../lib'
import NotFound from './NotFound'

const SKINS: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']
const LIFESTYLE: Photo[] = [PHOTOS.texture, PHOTOS.serum, PHOTOS.dropper, PHOTOS.centellaHand, PHOTOS.glass, PHOTOS.amber, PHOTOS.serumsPink]

/** Three lifestyle shots per product, picked steadily from its id so they never shuffle. */
function lifestyleFor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return [0, 1, 2].map((k) => LIFESTYLE[(h + k * 2) % LIFESTYLE.length])
}

export default function ProductPage() {
  const { slug } = useParams()
  const p = useProduct(slug)
  if (!p || p.status !== 'active') return <NotFound />
  return <ProductView key={p.id} id={p.id} />
}

function Fold({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="sf-fold" open={open}>
      <summary className="sf-fold__sum">
        <span className="sf-fold__title">{title}</span>
        <Plus size={18} className="sf-fold__plus" aria-hidden="true" />
        <Minus size={18} className="sf-fold__minus" aria-hidden="true" />
      </summary>
      <div className="sf-fold__body">{children}</div>
    </details>
  )
}

function ProductView({ id }: { id: string }) {
  const { tx, pick, num, money, date, lang } = useI18n()
  const p = useProduct(id)!
  const viewed = useStore((s) => s.viewed)
  const addToCart = useStore((s) => s.addToCart)
  const toggleWish = useStore((s) => s.toggleWish)
  const wished = useStore((s) => s.wishlist.includes(p.id))
  const inCart = useStore((s) => s.cart.find((l) => l.productId === p.id)?.qty ?? 0)
  const zones = useStore((s) => s.zones)
  const settings = useStore((s) => s.settings)
  const meGov = useStore((s) => s.customers.find((c) => c.id === s.me)?.governorateId)
  const allReviews = useStore((s) => s.reviews)
  const customers = useStore((s) => s.customers)
  const recent = useStore((s) => s.recentlyViewed)
  const products = useActiveProducts()
  const [qty, setQty] = useState(1)
  const [gov, setGov] = useState(meGov ?? 'cai')
  const [view, setView] = useState(0)

  useTitle(`${p.brand} ${pick(p.name)}`)
  useEffect(() => {
    viewed(p.id)
  }, [p.id, viewed])

  const stock = stockOf(p)
  const room = Math.max(0, stock - inCart)
  const lot = fefoBatch(p)
  const zone = zoneFor(gov, zones)
  const name = pick(p.name)
  const low = stock > 0 && stock <= p.lowStockAt
  const shots = useMemo(() => lifestyleFor(p.id), [p.id])
  const shot = view > 0 ? shots[view - 1] : undefined

  const reviews = useMemo(
    () => allReviews.filter((r) => r.productId === p.id && r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allReviews, p.id],
  )
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => Math.round(r.rating) === n).length }))
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const completes = useMemo(
    () =>
      products
        .filter(
          (x) =>
            x.id !== p.id &&
            stepCategoryOk(x) &&
            Math.abs(x.routineStep - p.routineStep) === 1 &&
            x.skinTypes.some((s) => p.skinTypes.includes(s)) &&
            stockOf(x) > 0,
        )
        .sort((a, b) => a.routineStep - b.routineStep || b.rating - a.rating)
        .slice(0, 4),
    [products, p],
  )
  const recently = useMemo(
    () =>
      recent
        .filter((x) => x !== p.id)
        .map((x) => products.find((y) => y.id === x))
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, 4),
    [recent, products, p.id],
  )

  const customerName = (cid: string, lang: 'ar' | 'en') => {
    const c = customers.find((x) => x.id === cid)
    if (!c) return tx('عميلة برايت', 'Bright customer')
    const full = c.name[lang] || c.name.en
    const [first, last] = full.split(' ')
    return last ? `${first} ${last[0]}.` : first
  }

  return (
    <div className="sf-pdp">
      <div className="sf-wrap">
        <nav className="sf-crumbs" aria-label={tx('مسار الصفحة', 'Breadcrumb')}>
          <Link to="/">{tx('الرئيسية', 'Home')}</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/shop/${p.category}`}>{pick(CATEGORY_LABEL[p.category])}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{name}</span>
        </nav>

        <div className="sf-pdp__top">
          <div className="sf-pdp__media">
            <div className="sf-pdp__tile" data-photo={shot ? '' : undefined}>
              {shot ? (
                <>
                  <img src={shot.src(1100, 1100)} alt={shot.alt[lang]} width={1100} height={1100} />
                  <span className="sf-pdp__tag">{tx('صورة لايف ستايل', 'Lifestyle')}</span>
                </>
              ) : (
                <ProductVisual image={p.image} visual={p.visual} brand={p.brand} size={p.size} title={`${p.brand} ${name}`} />
              )}
            </div>
            <ul className="sf-thumbs" aria-label={tx('صور المنتج', 'Product images')}>
              <li>
                <button type="button" className="sf-thumb sf-lit" aria-pressed={view === 0} onClick={() => setView(0)} aria-label={tx('صورة المنتج', 'Product image')}>
                  <ProductVisual image={p.image} visual={p.visual} brand={p.brand} bare />
                </button>
              </li>
              {shots.map((ph, i) => (
                <li key={ph.id}>
                  <button
                    type="button"
                    className="sf-thumb"
                    aria-pressed={view === i + 1}
                    onClick={() => setView(i + 1)}
                    aria-label={tx(`صورة لايف ستايل ${num(i + 1)}: ${ph.alt.ar}`, `Lifestyle image ${num(i + 1)}: ${ph.alt.en}`)}
                  >
                    <img src={ph.src(200, 200)} alt="" width={200} height={200} loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="sf-pdp__info">
            <Link to={`/brand/${brandSlug(p.brand)}`} className="sf-pdp__brand" lang="en">
              <bdi dir="ltr">{p.brand} · {p.size}</bdi>
            </Link>
            <h1 className="sf-pdp__name">{name}</h1>
            <a href="#reviews" className="sf-pdp__rating">
              <Stars rating={p.rating} count={p.reviewCount} />
            </a>
            <p className="sf-pdp__short">{pick(p.short)}</p>

            <dl className="sf-fit">
              <div>
                <dt>{tx('يناسب بشرة', 'Suits skin')}</dt>
                <dd>
                  <ul className="sf-chips">
                    {SKINS.map((s) => (
                      <li key={s} className={`sf-chip${p.skinTypes.includes(s) ? ' sf-chip--fit' : ' sf-chip--off'}`}>
                        {pick(SKIN_LABEL[s])}
                        {!p.skinTypes.includes(s) && <span className="sr-only">{tx(' (غير مناسب)', ' (not suited)')}</span>}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt>{tx('بيساعد في', 'Helps with')}</dt>
                <dd>
                  <ul className="sf-chips">
                    {p.concerns.map((c) => (
                      <li key={c}>
                        <Link className="sf-chip sf-chip--link" to={`/shop?concern=${c}`}>
                          {pick(CONCERN_LABEL[c])}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>

            <div className="sf-buybox">
              <div className="sf-buybox__price">
                <Price price={p.price} compareAt={p.compareAt} big />
                <p className={`sf-stock${stock === 0 ? ' sf-stock--out' : low ? ' sf-stock--low' : ''}`}>
                  {stock === 0 ? tx('خلصت حاليًا', 'Out of stock') : low ? tx(`باقي ${num(stock)} بس`, `Only ${num(stock)} left`) : tx('متوفر', 'In stock')}
                </p>
              </div>
              {room > 0 ? (
                <div className="sf-buyrow">
                  <Stepper value={Math.min(qty, room)} onChange={setQty} max={room} label={tx('الكمية', 'Quantity')} />
                  <button type="button" className="sf-btn sf-btn--lemon sf-btn--lg sf-btn--grow" onClick={() => addToCart(p.id, Math.min(qty, room))}>
                    {tx('أضيفي للسلة', 'Add to bag')}
                    <Arrow />
                  </button>
                  <button
                    type="button"
                    className="sf-iconbtn sf-iconbtn--lg"
                    aria-pressed={wished}
                    aria-label={wished ? tx('شيليه من المفضلة', 'Remove from wishlist') : tx('احفظيه في المفضلة', 'Save to wishlist')}
                    onClick={() => toggleWish(p.id)}
                  >
                    <Heart size={20} aria-hidden="true" fill={wished ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ) : (
                <div className="sf-buyrow">
                  <p className="sf-note">
                    {stock === 0
                      ? tx('المنتج ده خلص. احفظيه في المفضلة عشان يبقى قدامك.', 'This product is sold out. Save it to your wishlist to keep it handy.')
                      : tx('كل الكمية المتاحة في سلتك.', 'All available stock is in your bag.')}
                  </p>
                  <button type="button" className="sf-btn sf-btn--quiet" aria-pressed={wished} onClick={() => toggleWish(p.id)}>
                    <Heart size={18} aria-hidden="true" fill={wished ? 'currentColor' : 'none'} />
                    {wished ? tx('محفوظ في المفضلة', 'Saved to wishlist') : tx('احفظيه في المفضلة', 'Save to wishlist')}
                  </button>
                </div>
              )}
              {lot && (
                <p className="sf-lotline">
                  {tx('العبوة اللي هتوصلك من تشغيلة', 'Your unit comes from lot')} <span className="sf-mono">{lot.lot}</span>
                  {tx('، صالحة لحد ', ', good until ')}
                  {date(lot.expiry, { month: 'long', year: 'numeric' })}.
                </p>
              )}
            </div>

            <div className="sf-delivery">
              <Truck size={20} aria-hidden="true" className="sf-delivery__icon" />
              <div className="sf-delivery__body">
                <label className="sf-delivery__label">
                  <span>{tx('التوصيل لـ', 'Deliver to')}</span>
                  <select value={gov} onChange={(e) => setGov(e.target.value)}>
                    {GOVERNORATES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {pick(g.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <ul className="sf-delivery__facts">
                  <li>
                    {tx(`يوصل خلال ${num(zone.etaDays[0])}–${num(zone.etaDays[1])} يوم عمل`, `Arrives in ${num(zone.etaDays[0])}–${num(zone.etaDays[1])} working days`)}
                  </li>
                  <li>
                    {p.price * Math.max(1, qty) >= zone.freeOver
                      ? tx('الشحن مجاني للطلب ده', 'Free delivery on this order')
                      : tx(`الشحن ${money(zone.rate)}، ومجاني فوق ${money(zone.freeOver)}`, `Delivery ${money(zone.rate)}, free over ${money(zone.freeOver)}`)}
                  </li>
                  <li>{tx(`الدفع عند الاستلام برسوم ${money(zone.codFee)}`, `Cash on delivery for a ${money(zone.codFee)} fee`)}</li>
                </ul>
              </div>
            </div>

            <div className="sf-folds">
              <Fold title={tx('عن المنتج', 'Description')} open>
                <p>{pick(p.description)}</p>
                <p>{tx(`المنشأ: ${originName(p.origin).ar}`, `Origin: ${originName(p.origin).en}`)}</p>
              </Fold>
              <Fold title={tx('أهم المكوّنات', 'Key ingredients')}>
                <ul className="sf-ing">
                  {p.ingredients.map((i) => (
                    <li key={i.en}>{pick(i)}</li>
                  ))}
                </ul>
              </Fold>
              <Fold title={tx('طريقة الاستخدام', 'How to use')}>
                <p>{pick(p.howToUse)}</p>
                <div className="sf-routinefit">
                  <span className="sf-routinefit__step">
                    {tx(`الخطوة ${num(p.routineStep)} من ٦: ${STEP_LABEL[p.routineStep].ar}`, `Step ${num(p.routineStep)} of 6: ${STEP_LABEL[p.routineStep].en}`)}
                  </span>
                  {p.routineTime.includes('am') && (
                    <span className="sf-chip">
                      <Sun size={14} aria-hidden="true" />
                      {tx('الصبح', 'Morning')}
                    </span>
                  )}
                  {p.routineTime.includes('pm') && (
                    <span className="sf-chip">
                      <Moon size={14} aria-hidden="true" />
                      {tx('بالليل', 'Night')}
                    </span>
                  )}
                </div>
              </Fold>
              <Fold title={tx('سجل التشغيلة', 'Lot record')}>
                <p>{tx('من مصدره لحد العبوة اللي هتوصلك.', 'From its source to the unit you will receive.')}</p>
                <Provenance p={p} />
              </Fold>
              <Fold title={tx('الشحن والدفع عند الاستلام', 'Shipping & cash on delivery')}>
                <ul className="sf-zones">
                  {zones.filter((z) => z.enabled).map((z) => (
                    <li key={z.id}>
                      <span className="sf-zones__name">{pick(z.name)}</span>
                      <span>{tx(`${num(z.etaDays[0])}–${num(z.etaDays[1])} يوم`, `${num(z.etaDays[0])}–${num(z.etaDays[1])} days`)}</span>
                      <span>{tx(`${money(z.rate)}، مجاني فوق ${money(z.freeOver)}`, `${money(z.rate)}, free over ${money(z.freeOver)}`)}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  {settings.codEnabled
                    ? tx(
                        `ادفعي كاش للمندوب لما الطلب يوصل، للطلبات لحد ${money(settings.codMax)}. بنأكد كل طلب معاكي على واتساب قبل ما يتشحن.`,
                        `Pay the courier in cash when it arrives, on orders up to ${money(settings.codMax)}. We confirm every order with you on WhatsApp before it ships.`,
                      )
                    : tx('الدفع عند الاستلام مش متاح دلوقتي.', 'Cash on delivery is not available right now.')}
                </p>
              </Fold>
            </div>
          </div>
        </div>
      </div>

      <section className="sf-section sf-section--rule" id="reviews" aria-labelledby="h-rev">
        <div className="sf-wrap">
          <div className="sf-sechead">
            <h2 id="h-rev" className="sf-h2">{tx('التقييمات', 'Reviews')}</h2>
          </div>
          {reviews.length === 0 ? (
            <p className="sf-muted">{tx('لسه مفيش تقييمات منشورة للمنتج ده.', 'No published reviews for this product yet.')}</p>
          ) : (
            <div className="sf-reviews">
              <div className="sf-reviews__sum">
                <p className="sf-reviews__avg">{num(avg, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                <Stars rating={avg} />
                <p className="sf-reviews__from">{tx(`من ${num(reviews.length)} تقييم منشور هنا`, `From ${num(reviews.length)} reviews published here`)}</p>
                <ul className="sf-dist" aria-label={tx('توزيع التقييمات', 'Rating distribution')}>
                  {dist.map((d) => (
                    <li key={d.n}>
                      <span>{tx(`${num(d.n)} نجوم`, `${num(d.n)} stars`)}</span>
                      <span className="sf-dist__bar" aria-hidden="true">
                        <span style={{ inlineSize: `${reviews.length ? (d.c / reviews.length) * 100 : 0}%` }} />
                      </span>
                      <span className="tabular">{num(d.c)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="sf-reviews__list">
                {reviews.slice(0, 6).map((r) => (
                  <li key={r.id} className="sf-review">
                    <div className="sf-review__head">
                      <Stars rating={r.rating} size={12} />
                      <span className="sf-review__date">{date(r.createdAt)}</span>
                    </div>
                    <p className="sf-review__title" dir={r.lang === 'ar' ? 'rtl' : 'ltr'}>{r.title}</p>
                    <p dir={r.lang === 'ar' ? 'rtl' : 'ltr'}>{r.body}</p>
                    <p className="sf-review__who">
                      <bdi>{customerName(r.customerId, r.lang)}</bdi>
                      <span className="sf-chip sf-chip--sm">{tx(`بشرة ${SKIN_LABEL[r.skinType].ar}`, `${SKIN_LABEL[r.skinType].en} skin`)}</span>
                      {r.verified && (
                        <span className="sf-verified">
                          <BadgeCheck size={14} aria-hidden="true" />
                          {tx('مشترية مؤكدة', 'Verified buyer')}
                        </span>
                      )}
                    </p>
                    {r.reply && (
                      <p className="sf-review__reply" dir="auto">
                        <strong>{tx('رد برايت: ', 'Bright replied: ')}</strong>
                        {r.reply}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {completes.length > 0 && (
        <section className="sf-section sf-section--rule" aria-labelledby="h-comp">
          <div className="sf-wrap">
            <div className="sf-sechead">
              <h2 id="h-comp" className="sf-h2">{tx('كمّلي روتينك', 'Completes your routine')}</h2>
              <p className="sf-muted">{tx('الخطوة اللي قبله واللي بعده، لنفس نوع البشرة.', 'The step before and after it, for the same skin types.')}</p>
            </div>
          </div>
          <ProductPanes products={completes} />
        </section>
      )}

      {recently.length > 0 && (
        <section className="sf-section sf-section--rule" aria-labelledby="h-recent">
          <div className="sf-wrap">
            <div className="sf-sechead">
              <h2 id="h-recent" className="sf-h2">{tx('رجّعي اللي شفتيه', 'Pick up where you left off')}</h2>
            </div>
          </div>
          <ProductPanes products={recently} />
        </section>
      )}
    </div>
  )
}
