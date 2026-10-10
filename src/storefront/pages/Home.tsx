import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import type { Concern, Product, SkinType } from '../../data/types'
import { CONCERN_LABEL, SKIN_LABEL, STEP_LABEL, originName } from '../../data/catalog'
import { ProductVisual } from '../../components/ProductVisual'
import { Changsal } from '../components/Changsal'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { Hero } from '../components/Hero'
import { ProductPanes } from '../components/ProductCard'
import { Provenance } from '../components/Provenance'
import { Forward } from '../components/bits'
import { IMPORTED_ORIGINS, brandSlug, daysUntil, fefoBatch, stepCategoryOk, useActiveProducts, useBrands, useTitle } from '../lib'

const SKINS: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']
const CONCERNS: Concern[] = ['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness', 'sun', 'barrier']

function routineFor(products: Product[], time: 'am' | 'pm') {
  const steps = time === 'am' ? [1, 2, 3, 5, 6] : [1, 2, 3, 4, 5]
  return steps
    .map((step) =>
      products
        .filter((p) => p.routineStep === step && p.routineTime.includes(time) && stepCategoryOk(p) && stockOf(p) > 0)
        .sort((a, b) => b.rating * Math.log(b.reviewCount + 1) - a.rating * Math.log(a.reviewCount + 1))[0],
    )
    .filter((p): p is Product => !!p)
}

export default function Home() {
  const { tx, pick, num, money } = useI18n()
  useTitle(undefined)
  const products = useActiveProducts()
  const brands = useBrands()
  const addToCart = useStore((s) => s.addToCart)

  const best = useMemo(() => [...products].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 8), [products])
  const steps = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6].map((n) => {
        const inStep = products.filter((p) => p.routineStep === n && stepCategoryOk(p))
        const lead = [...inStep].sort((a, b) => b.reviewCount - a.reviewCount)[0]
        return { n, count: inStep.length, lead }
      }),
    [products],
  )
  const kr = products.filter((p) => p.origin === 'KR')
  const imported = products.filter((p) => p.origin !== 'KR')
  const krBrands = new Set(kr.map((p) => p.brand)).size
  const impBrands = new Set(imported.map((p) => p.brand)).size
  const impCountries = IMPORTED_ORIGINS.filter((o) => imported.some((p) => p.origin === o))
  // Show the trail of a bestseller whose current lot has a comfortable shelf life.
  const traced = best.find((p) => {
    const lot = fefoBatch(p)
    return lot && daysUntil(lot.expiry) > 240
  }) ?? best[0]
  const am = useMemo(() => routineFor(products, 'am'), [products])
  const pm = useMemo(() => routineFor(products, 'pm'), [products])

  const addAll = (list: Product[]) => list.forEach((p) => addToCart(p.id, 1))

  return (
    <>
      <Hero />

      {/* Routine steps: a strip of panes, in routine order */}
      <section className="sf-section" aria-labelledby="h-steps">
        <div className="sf-wrap">
          <div className="sf-sechead">
            <h2 id="h-steps" className="sf-h2">{tx('ابدئي بالخطوة اللي ناقصاكي', 'Start with the step you are missing')}</h2>
            <p className="sf-muted">{tx('الروتين الكوري ست خطوات، من التنظيف للحماية. اختاري الخطوة وشوفي منتجاتها.', 'A Korean routine runs six steps, from cleanse to protect. Pick a step to see what fits it.')}</p>
          </div>
          <ol className="sf-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <Link to={`/shop?step=${s.n}`} className="sf-step">
                  <span className="sf-step__n" aria-hidden="true">{num(s.n)}</span>
                  <span className="sf-step__label">{pick(STEP_LABEL[s.n])}</span>
                  <span className="sf-step__count">{tx(`${num(s.count)} منتج`, `${num(s.count)} products`)}</span>
                  {s.lead && (
                    <span className="sf-step__visual" aria-hidden="true">
                      <ProductVisual visual={s.lead.visual} brand={s.lead.brand} bare />
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bestsellers: the dense grid */}
      <section className="sf-section sf-section--tight" aria-labelledby="h-best">
        <div className="sf-wrap">
          <div className="sf-sechead sf-sechead--row">
            <h2 id="h-best" className="sf-h2">{tx('اختاري من الأكثر مبيعًا', 'Shop the bestsellers')}</h2>
            <Link to="/shop?sort=best" className="sf-textbtn">
              {tx('شوفي كل المنتجات', 'See all products')}
              <Forward />
            </Link>
          </div>
          <ProductPanes products={best} label={tx('الأكثر مبيعًا', 'Bestsellers')} />
        </div>
      </section>

      {/* Skin type and concern: the quiet passage */}
      <section className="sf-section sf-section--quiet" aria-labelledby="h-skin">
        <div className="sf-wrap sf-skin">
          <div className="sf-skin__intro">
            <h2 id="h-skin" className="sf-h2">{tx('تسوّقي على قد بشرتك', 'Shop for your skin')}</h2>
            <p className="sf-muted">{tx('كل منتج متعلّم بأنواع البشرة اللي تناسبه. اختاري نوعك ونعرضلك اللي يناسبك بس.', 'Every product is tagged with the skin types it suits. Pick yours and see only what fits.')}</p>
          </div>
          <ul className="sf-skin__types">
            {SKINS.map((s) => (
              <li key={s}>
                <Link to={`/shop?skin=${s}`} className="sf-skinpane">
                  <span className="sf-skinpane__label">{tx(`بشرة ${SKIN_LABEL[s].ar}`, `${SKIN_LABEL[s].en} skin`)}</span>
                  <span className="sf-skinpane__n">{tx(`${num(products.filter((p) => p.skinTypes.includes(s)).length)} منتج`, `${num(products.filter((p) => p.skinTypes.includes(s)).length)} products`)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="sf-skin__concerns">
            <h3 className="sf-h4">{tx('أو حسب اللي مضايقك', 'Or by what is bothering you')}</h3>
            <ul className="sf-chips sf-chips--links">
              {CONCERNS.map((c) => (
                <li key={c}>
                  <Link to={`/shop?concern=${c}`} className="sf-chip sf-chip--link">
                    {pick(CONCERN_LABEL[c])}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* K-beauty vs imported */}
      <section className="sf-section" aria-labelledby="h-origin">
        <div className="sf-wrap">
          <div className="sf-sechead">
            <h2 id="h-origin" className="sf-h2">{tx('اختاري مدرستك في العناية', 'Choose your school of care')}</h2>
          </div>
          <div className="sf-split">
            <Link to="/shop?origin=KR" className="sf-split__pane sf-split__pane--kr">
              <span className="sf-split__title">{tx('كوري', 'Korean')}</span>
              <span className="sf-split__body">{tx('طبقات خفيفة، مكوّنات مهدّية، وترطيب على مراحل.', 'Light layers, calming ingredients, hydration in steps.')}</span>
              <span className="sf-split__meta">{tx(`${num(kr.length)} منتج من ${num(krBrands)} ماركة`, `${num(kr.length)} products from ${num(krBrands)} brands`)}</span>
              <span className="sf-textbtn">{tx('تسوقي الكوري', 'Shop Korean')}<Forward /></span>
              <span className="sf-split__shelf" aria-hidden="true">
                {kr.slice(0, 3).map((p) => (
                  <ProductVisual key={p.id} visual={p.visual} brand={p.brand} bare />
                ))}
              </span>
            </Link>
            <Link to={`/shop?origin=${IMPORTED_ORIGINS.join(',')}`} className="sf-split__pane sf-split__pane--imp">
              <span className="sf-split__title">{tx('مستورد', 'Imported')}</span>
              <span className="sf-split__body">
                {tx(
                  `تركيبات صيدلانية من ${impCountries.map((o) => originName(o).ar).join('، ')}.`,
                  `Dermatological formulas from ${impCountries.map((o) => originName(o).en).join(', ')}.`,
                )}
              </span>
              <span className="sf-split__meta">{tx(`${num(imported.length)} منتج من ${num(impBrands)} ماركة`, `${num(imported.length)} products from ${num(impBrands)} brands`)}</span>
              <span className="sf-textbtn">{tx('تسوقي المستورد', 'Shop imported')}<Forward /></span>
              <span className="sf-split__shelf" aria-hidden="true">
                {imported.slice(0, 3).map((p) => (
                  <ProductVisual key={p.id} visual={p.visual} brand={p.brand} bare />
                ))}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Provenance: lacquer band */}
      {traced && (
        <section className="sf-section sf-band" aria-labelledby="h-trail">
          <div className="sf-band__lattice" aria-hidden="true">
            <Changsal cell={144} stroke="var(--lacquer-800)" width={2} />
          </div>
          <div className="sf-wrap sf-band__grid">
            <div className="sf-band__copy">
              <h2 id="h-trail" className="sf-h2">{tx('اتأكدي من التشغيلة قبل ما تطلبي', 'Check the lot before you order')}</h2>
              <p>
                {tx(
                  'كل منتج عندنا ليه سجل: جاي منين، وصل إمتى، والعبوة اللي هتوصلك صالحة لحد إمتى. ده السجل الحقيقي لواحد من أكتر منتجاتنا مبيعًا.',
                  'Every product here has a record: where it came from, when it arrived, and how long the unit you get is good for. This is the live record of one of our bestsellers.',
                )}
              </p>
              <Link to={`/p/${traced.slug}`} className="sf-band__product">
                <span className="sf-band__pane sf-lit" aria-hidden="true">
                  <ProductVisual visual={traced.visual} brand={traced.brand} bare />
                </span>
                <span>
                  <span className="sf-card__brand"><bdi>{traced.brand}</bdi></span>
                  <span className="sf-band__name">{pick(traced.name)}</span>
                  <span className="sf-textbtn">{tx('افتحي صفحة المنتج', 'Open the product page')}<Forward /></span>
                </span>
              </Link>
            </div>
            <Provenance p={traced} tone="lacquer" />
          </div>
        </section>
      )}

      {/* AM / PM routine from the catalog */}
      <section className="sf-section" aria-labelledby="h-ampm">
        <div className="sf-wrap">
          <div className="sf-sechead">
            <h2 id="h-ampm" className="sf-h2">{tx('جهّزي روتين الصبح وروتين الليل', 'Set up your morning and night')}</h2>
            <p className="sf-muted">{tx('أعلى منتج تقييمًا في كل خطوة، متاح دلوقتي. ابدئي بيهم وعدّلي على راحتك.', 'The highest-rated product in stock for each step. Start there and adjust as you go.')}</p>
          </div>
          <div className="sf-ampm">
            {([['am', am], ['pm', pm]] as const).map(([t, list]) => (
              <div key={t} className={`sf-ampm__col sf-ampm__col--${t}`}>
                <h3 className="sf-ampm__h">
                  {t === 'am' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
                  {t === 'am' ? tx('الصبح', 'Morning') : tx('بالليل', 'Night')}
                </h3>
                <ol className="sf-ampm__list">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link to={`/p/${p.slug}`} className="sf-ampm__row">
                        <span className="sf-ampm__step">{num(p.routineStep)}</span>
                        <span className="sf-ampm__pane sf-lit" aria-hidden="true">
                          <ProductVisual visual={p.visual} brand={p.brand} bare />
                        </span>
                        <span className="sf-ampm__text">
                          <span className="sf-ampm__steplabel">{pick(STEP_LABEL[p.routineStep])}</span>
                          <span className="sf-ampm__name">{pick(p.name)}</span>
                        </span>
                        <span className="sf-ampm__price tabular">{money(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <div className="sf-ampm__foot">
                  <span>
                    {tx('المجموع', 'Total')} <strong className="tabular">{money(list.reduce((s, p) => s + p.price, 0))}</strong>
                  </span>
                  <button type="button" className="sf-btn sf-btn--quiet" onClick={() => addAll(list)}>
                    {t === 'am' ? tx('أضيفي روتين الصبح للسلة', 'Add the morning routine') : tx('أضيفي روتين الليل للسلة', 'Add the night routine')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands strip */}
      <section className="sf-section sf-section--tight" aria-labelledby="h-brands">
        <div className="sf-wrap">
          <div className="sf-sechead">
            <h2 id="h-brands" className="sf-h2">{tx('تسوّقي حسب الماركة', 'Shop by brand')}</h2>
          </div>
          <ul className="sf-brands">
            {brands.map(([b, n]) => (
              <li key={b}>
                <Link to={`/brand/${brandSlug(b)}`} className="sf-brands__cell" aria-label={tx(`${b}، ${num(n)} منتج`, `${b}, ${num(n)} products`)}>
                  <bdi>{b}</bdi>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing */}
      <section className="sf-section sf-closing" aria-labelledby="h-close">
        <div className="sf-closing__lattice" aria-hidden="true">
          <Changsal cell={144} stroke="var(--paper-3)" width={1.5} />
        </div>
        <div className="sf-wrap sf-closing__inner">
          <h2 id="h-close" className="sf-h2 sf-closing__h">{tx('اعرفي روتينك في أربع أسئلة', 'Find your routine in four questions')}</h2>
          <p className="sf-muted">{tx('نوع بشرتك، اللي مضايقك، الصبح ولا بالليل، وميزانيتك. وبعدها نرشّحلك منتج لكل خطوة.', 'Your skin type, your main concern, morning or night, and your budget. Then one product for every step.')}</p>
          <Link to="/routine" className="sf-btn sf-btn--brass sf-btn--lg">
            {tx('ابدئي الأسئلة', 'Start the questions')}
          </Link>
        </div>
      </section>
    </>
  )
}
