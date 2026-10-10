import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, RefreshCw, Sun, SunMoon } from 'lucide-react'
import type { Concern, Product, SkinType } from '../../data/types'
import { CONCERN_LABEL, SKIN_LABEL, STEP_LABEL } from '../../data/catalog'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { stockOf, useStore } from '../../store'
import { Back, Forward, Stars } from '../components/bits'
import { stepCategoryOk, useActiveProducts, useTitle } from '../lib'

type Time = 'am' | 'pm' | 'both'
type Budget = 'value' | 'balanced' | 'treat'
type Answers = { skin?: SkinType; concern?: Concern; time?: Time; budget?: Budget }

const SKINS: SkinType[] = ['oily', 'dry', 'combination', 'sensitive', 'normal']
const CONCERNS: Concern[] = ['acne', 'hydration', 'brightening', 'aging', 'pores', 'redness', 'sun', 'barrier']

function stepsFor(t: Time) {
  if (t === 'am') return [1, 2, 3, 5, 6]
  if (t === 'pm') return [1, 2, 3, 4, 5]
  return [1, 2, 3, 4, 5, 6]
}

/** Ranked candidates for one routine step. */
function candidates(products: Product[], step: number, a: Required<Answers>) {
  const times = a.time === 'both' ? ['am', 'pm'] : [a.time]
  const pool = products.filter(
    (p) =>
      p.routineStep === step &&
      stepCategoryOk(p) &&
      stockOf(p) > 0 &&
      p.skinTypes.includes(a.skin) &&
      p.routineTime.some((t) => times.includes(t)),
  )
  const score = (p: Product) => {
    let s = p.rating * 2 + Math.log10(p.reviewCount + 1)
    if (p.concerns.includes(a.concern)) s += 4
    if (a.budget === 'value') s -= p.price / 400
    if (a.budget === 'treat') s += p.price / 800
    return s
  }
  return [...pool].sort((x, y) => score(y) - score(x))
}

export default function Routine() {
  const { tx, pick, num, money } = useI18n()
  useTitle(tx('اعرفي روتينك', 'Routine finder'))
  const products = useActiveProducts()
  const addToCart = useStore((s) => s.addToCart)
  const [a, setA] = useState<Answers>({})
  const [q, setQ] = useState(0)
  const [swap, setSwap] = useState<Record<number, number>>({})

  const questions = [
    {
      key: 'skin' as const,
      title: tx('بشرتك عاملة إزاي معظم اليوم؟', 'How does your skin feel most of the day?'),
      options: SKINS.map((s) => ({
        v: s,
        label: tx(`بشرة ${SKIN_LABEL[s].ar}`, `${SKIN_LABEL[s].en} skin`),
        hint: {
          oily: tx('بتلمع وبتبان المسام، خصوصًا في نص الوش.', 'Shiny, with visible pores, especially in the centre.'),
          dry: tx('بتشد بعد الغسيل وساعات بتقشّر.', 'Feels tight after washing and sometimes flakes.'),
          combination: tx('دهنية في المنطقة T وعادية أو جافة في الخدود.', 'Oily in the T-zone, normal or dry on the cheeks.'),
          sensitive: tx('بتحمرّ أو بتلسع بسهولة مع منتجات جديدة.', 'Reddens or stings easily with new products.'),
          normal: tx('متوازنة ونادرًا بتضايقك.', 'Balanced and rarely gives you trouble.'),
        }[s],
      })),
    },
    {
      key: 'concern' as const,
      title: tx('إيه أكتر حاجة عايزة تحسّنيها؟', 'What do you most want to improve?'),
      options: CONCERNS.map((c) => ({ v: c, label: pick(CONCERN_LABEL[c]), hint: '' })),
    },
    {
      key: 'time' as const,
      title: tx('عايزة روتين لإمتى؟', 'Which routine do you want?'),
      options: [
        { v: 'am' as const, label: tx('الصبح', 'Morning'), hint: tx('تنظيف، تونر، سيروم، مرطّب، وواقي شمس.', 'Cleanse, tone, treat, moisturize and protect.') },
        { v: 'pm' as const, label: tx('بالليل', 'Night'), hint: tx('تنظيف، تونر، علاج، ماسك، ومرطّب.', 'Cleanse, tone, treat, mask and moisturize.') },
        { v: 'both' as const, label: tx('الاتنين', 'Both'), hint: tx('الست خطوات كلهم، وكل منتج بيتعلّم إمتى يتحط.', 'All six steps, each marked for when to use it.') },
      ],
    },
    {
      key: 'budget' as const,
      title: tx('ميزانيتك للروتين؟', 'What is your budget?'),
      options: [
        { v: 'value' as const, label: tx('اقتصادي', 'Keep it lean'), hint: tx('أقل سعر من غير ما نتنازل عن الملاءمة.', 'The lowest prices that still fit your skin.') },
        { v: 'balanced' as const, label: tx('متوازن', 'Balanced'), hint: tx('الأعلى تقييمًا لنوع بشرتك.', 'The best-rated picks for your skin.') },
        { v: 'treat' as const, label: tx('دلّعي نفسك', 'Treat yourself'), hint: tx('مفيش مانع من التركيبات الفاخرة.', 'Premium formulas welcome.') },
      ],
    },
  ]

  const done = a.skin && a.concern && a.time && a.budget
  const plan = useMemo(() => {
    if (!done) return []
    const full = a as Required<Answers>
    return stepsFor(full.time)
      .map((step) => {
        const list = candidates(products, step, full)
        if (!list.length) return undefined
        const i = (swap[step] ?? 0) % list.length
        return { step, product: list[i], alts: list.length }
      })
      .filter((x): x is { step: number; product: Product; alts: number } => !!x)
  }, [done, a, products, swap])
  const total = plan.reduce((s, x) => s + x.product.price, 0)

  if (done && q >= questions.length) {
    const time = a.time!
    return (
      <div className="sf-wrap sf-page sf-routine">
        <header className="sf-shop__head">
          <h1 className="sf-h1">{tx('روتينك جاهز', 'Your routine is ready')}</h1>
          <p className="sf-muted">
            {tx(
              `لبشرة ${SKIN_LABEL[a.skin!].ar}، مع تركيز على ${CONCERN_LABEL[a.concern!].ar}. منتج واحد لكل خطوة، كلهم متوفرين دلوقتي.`,
              `For ${SKIN_LABEL[a.skin!].en.toLowerCase()} skin, focused on ${CONCERN_LABEL[a.concern!].en.toLowerCase()}. One product per step, all in stock now.`,
            )}
          </p>
        </header>
        <ol className="sf-plan">
          {plan.map(({ step, product: p, alts }) => (
            <li key={step} className="sf-plan__row">
              <span className="sf-plan__n" aria-hidden="true">{num(step)}</span>
              <span className="sf-plan__pane sf-lit" aria-hidden="true">
                <ProductVisual visual={p.visual} brand={p.brand} bare />
              </span>
              <div className="sf-plan__text">
                <p className="sf-plan__step">
                  {pick(STEP_LABEL[step])}
                  {time === 'both' && (
                    <span className="sf-plan__time">
                      {p.routineTime.includes('am') && <Sun size={14} aria-label={tx('الصبح', 'Morning')} />}
                      {p.routineTime.includes('pm') && <Moon size={14} aria-label={tx('بالليل', 'Night')} />}
                    </span>
                  )}
                </p>
                <Link to={`/p/${p.slug}`} className="sf-plan__name">
                  <span className="sf-card__brand"><bdi>{p.brand}</bdi></span> {pick(p.name)}
                </Link>
                <Stars rating={p.rating} count={p.reviewCount} size={12} />
                {p.concerns.includes(a.concern!) && <span className="sf-chip sf-chip--fit sf-chip--sm">{tx(`بيساعد في ${CONCERN_LABEL[a.concern!].ar}`, `Helps with ${CONCERN_LABEL[a.concern!].en.toLowerCase()}`)}</span>}
              </div>
              <div className="sf-plan__end">
                <span className="tabular">{money(p.price)}</span>
                {alts > 1 && (
                  <button type="button" className="sf-textbtn sf-small" onClick={() => setSwap((s) => ({ ...s, [step]: (s[step] ?? 0) + 1 }))}>
                    <RefreshCw size={14} aria-hidden="true" />
                    {tx('بدّلي المنتج', 'Swap product')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {plan.length === 0 && <p className="sf-note">{tx('مفيش منتجات متوفرة تناسب الاختيارات دي دلوقتي. جرّبي ميزانية أو وقت تاني.', 'Nothing in stock fits these answers right now. Try another budget or time.')}</p>}
        <div className="sf-plan__foot">
          <p>
            {tx(`${num(plan.length)} منتجات، المجموع`, `${num(plan.length)} products, total`)} <strong className="tabular sf-plan__total">{money(total)}</strong>
          </p>
          <div className="sf-row">
            <button type="button" className="sf-btn sf-btn--brass sf-btn--lg" disabled={!plan.length} onClick={() => plan.forEach((x) => addToCart(x.product.id, 1))}>
              {tx('أضيفي الروتين كله للسلة', 'Add the whole routine to bag')}
            </button>
            <button
              type="button"
              className="sf-textbtn"
              onClick={() => {
                setQ(0)
                setSwap({})
              }}
            >
              {tx('عدّلي إجاباتك', 'Change your answers')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const cur = questions[Math.min(q, questions.length - 1)]
  const value = a[cur.key]
  const icon = (v: string) => (v === 'am' ? <Sun size={20} aria-hidden="true" /> : v === 'pm' ? <Moon size={20} aria-hidden="true" /> : v === 'both' ? <SunMoon size={20} aria-hidden="true" /> : null)

  return (
    <div className="sf-wrap sf-page sf-routine">
      <header className="sf-shop__head">
        <h1 className="sf-h1">{tx('اعرفي روتينك', 'Find your routine')}</h1>
        <p className="sf-muted">{tx('أربع أسئلة، وبعدها منتج واحد لكل خطوة من المتوفر عندنا.', 'Four questions, then one in-stock product for every step.')}</p>
      </header>
      <div className="sf-quiz">
        <div className="sf-quiz__progress" aria-hidden="true">
          {questions.map((_, i) => (
            <span key={i} data-lit={i <= q || undefined} />
          ))}
        </div>
        <fieldset className="sf-quiz__q">
          <legend>
            <span className="sf-quiz__count">{tx(`سؤال ${num(q + 1)} من ${num(questions.length)}`, `Question ${num(q + 1)} of ${num(questions.length)}`)}</span>
            <span className="sf-quiz__title">{cur.title}</span>
          </legend>
          <div className={`sf-quiz__opts${cur.key === 'concern' ? ' sf-quiz__opts--chips' : ''}`}>
            {cur.options.map((o) => (
              <label key={o.v} className="sf-opt" data-on={value === o.v || undefined}>
                <input
                  type="radio"
                  name={cur.key}
                  value={o.v}
                  checked={value === o.v}
                  onChange={() => {
                    setA((x) => ({ ...x, [cur.key]: o.v }))
                    setSwap({})
                  }}
                />
                {icon(o.v)}
                <span className="sf-opt__text">
                  <span className="sf-opt__label">{o.label}</span>
                  {o.hint && <span className="sf-opt__hint">{o.hint}</span>}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sf-quiz__nav">
          {q > 0 ? (
            <button type="button" className="sf-textbtn" onClick={() => setQ(q - 1)}>
              <Back />
              {tx('السؤال اللي فات', 'Previous question')}
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="sf-btn sf-btn--lacquer" disabled={!value} onClick={() => setQ(q + 1)}>
            {q === questions.length - 1 ? tx('اعرضي روتيني', 'Show my routine') : tx('السؤال اللي بعده', 'Next question')}
            <Forward />
          </button>
        </div>
      </div>
    </div>
  )
}
