import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react'
import { GOVERNORATES } from '../../data/seed'
import type { PaymentMethod } from '../../data/types'
import { ProductVisual } from '../../components/ProductVisual'
import { useI18n } from '../../i18n'
import { evaluateCode, useStore, zoneFor } from '../../store'
import { PHONE_RE, normalizePhone, useCartLines, useTitle } from '../lib'
import { Arrow } from '../components/bits'

type Errors = Partial<Record<'name' | 'phone' | 'gov' | 'address' | 'email', string>>

export default function Checkout() {
  const { tx, pick, money, num } = useI18n()
  useTitle(tx('إتمام الطلب', 'Checkout'))
  const navigate = useNavigate()
  const { lines, subtotal, count } = useCartLines()
  const zones = useStore((s) => s.zones)
  const discounts = useStore((s) => s.discounts)
  const settings = useStore((s) => s.settings)
  const placeOrder = useStore((s) => s.placeOrder)
  const me = useStore((s) => s.customers.find((c) => c.id === s.me))

  const [name, setName] = useState(me ? me.name.ar || me.name.en : '')
  const [phone, setPhone] = useState(me?.phone ?? '')
  const [gov, setGov] = useState(me?.governorateId ?? '')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState(me?.email ?? '')
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  const [codeInput, setCodeInput] = useState('')
  const [code, setCode] = useState<string | undefined>()
  const [codeMsg, setCodeMsg] = useState<string | undefined>()
  const [errors, setErrors] = useState<Errors>({})
  const [placing, setPlacing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const zone = zoneFor(gov || 'cai', zones)
  const evald = evaluateCode(code, subtotal, discounts)
  const freeShip = evald.freeShipping || subtotal >= zone.freeOver
  const shipping = gov ? (freeShip ? 0 : zone.rate) : undefined
  const codAllowed = settings.codEnabled && subtotal - evald.discount + (shipping ?? 0) + zone.codFee <= settings.codMax
  const method: PaymentMethod = payment === 'cod' && !codAllowed ? 'card' : payment
  const codFee = method === 'cod' ? zone.codFee : 0
  const total = subtotal - evald.discount + (shipping ?? 0) + codFee

  if (!lines.length && !placing) {
    return (
      <div className="sf-wrap sf-page">
        <div className="sf-empty">
          <h1 className="sf-h1">{tx('سلتك فاضية', 'Your bag is empty')}</h1>
          <p className="sf-muted">{tx('ضيفي منتج واحد على الأقل عشان تكمّلي الطلب.', 'Add at least one product to check out.')}</p>
          <div className="sf-row">
            <Link to="/shop" className="sf-btn sf-btn--quiet">{tx('تسوقي المنتجات', 'Shop products')}<Arrow /></Link>
            <Link to="/routine" className="sf-textbtn">{tx('اعرفي روتينك', 'Find your routine')}</Link>
          </div>
        </div>
      </div>
    )
  }
  if (!lines.length) return null

  const validate = (): Errors => {
    const e: Errors = {}
    if (name.trim().length < 2) e.name = tx('اكتبي اسمك عشان المندوب يعرف يسلّمك.', 'Enter your name so the courier knows who to hand it to.')
    const ph = normalizePhone(phone)
    if (!ph) e.phone = tx('اكتبي رقم موبايلك.', 'Enter your mobile number.')
    else if (!PHONE_RE.test(ph)) e.phone = tx('الرقم لازم يكون موبايل مصري من ١١ رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.', 'Use an 11-digit Egyptian mobile starting with 010, 011, 012 or 015.')
    if (!gov) e.gov = tx('اختاري المحافظة عشان نحسب الشحن.', 'Choose your governorate so we can price delivery.')
    if (address.trim().length < 8) e.address = tx('اكتبي العنوان بالتفصيل: الحي، الشارع، رقم العمارة والشقة.', 'Enter the full address: area, street, building and flat.')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = tx('الإيميل مش مكتوب صح.', 'This email address does not look right.')
    return e
  }

  const applyCode = () => {
    const c = codeInput.trim()
    if (!c) return
    const r = evaluateCode(c, subtotal, discounts)
    if (r.valid) {
      setCode(c.toUpperCase())
      setCodeMsg(undefined)
    } else {
      setCode(undefined)
      const d = discounts.find((x) => x.code.toUpperCase() === c.toUpperCase() && x.active && !x.automatic)
      const auto = discounts.find((x) => x.code.toUpperCase() === c.toUpperCase() && x.automatic)
      setCodeMsg(
        auto
          ? tx('ده عرض مش كود، ومينفعش يتكتب هنا.', 'This is an offer, not a code, so it cannot be entered here.')
          : d && subtotal < d.minSubtotal
          ? tx(`الكود ده بيشتغل على طلبات فوق ${money(d.minSubtotal)}.`, `This code works on orders over ${money(d.minSubtotal)}.`)
          : tx('الكود ده مش شغّال. اتأكدي من الحروف.', 'This code is not valid. Check the spelling.'),
      )
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setPlacing(true)
    const order = placeOrder({
      name: name.trim(),
      phone: normalizePhone(phone),
      email: email.trim() || undefined,
      governorateId: gov,
      address: address.trim(),
      payment: method,
      code,
    })
    navigate(`/order/${order.id}`, { replace: true })
  }

  const clearErr = (k: keyof Errors) => errors[k] && setErrors((x) => ({ ...x, [k]: undefined }))
  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p className="sf-field__err" id={`err-${k}`}>
        {errors[k]}
      </p>
    ) : null
  const aria = (k: keyof Errors) => ({ 'aria-invalid': !!errors[k] || undefined, 'aria-describedby': errors[k] ? `err-${k}` : undefined })

  const methods: { id: PaymentMethod; icon: ReactNode; label: string; note: string; disabled?: boolean }[] = [
    {
      id: 'cod',
      icon: <Banknote size={20} aria-hidden="true" />,
      label: tx('الدفع عند الاستلام', 'Cash on delivery'),
      note: codAllowed
        ? tx(`ادفعي للمندوب لما الطلب يوصل. رسوم ${money(zone.codFee)}.`, `Pay the courier when it arrives. ${money(zone.codFee)} fee.`)
        : tx(`الدفع عند الاستلام متاح للطلبات لحد ${money(settings.codMax)}.`, `Cash on delivery is available for orders up to ${money(settings.codMax)}.`),
      disabled: !codAllowed,
    },
    { id: 'card', icon: <CreditCard size={20} aria-hidden="true" />, label: tx('كارت بنكي', 'Bank card'), note: tx('تجريبي: مفيش فلوس هتتخصم.', 'Demo: no money is charged.') },
    { id: 'wallet', icon: <Wallet size={20} aria-hidden="true" />, label: tx('محفظة موبايل', 'Mobile wallet'), note: tx('تجريبي: مفيش فلوس هتتخصم.', 'Demo: no money is charged.') },
    { id: 'instapay', icon: <Smartphone size={20} aria-hidden="true" />, label: tx('إنستاباي', 'InstaPay'), note: tx('تجريبي: مفيش فلوس هتتخصم.', 'Demo: no money is charged.') },
  ]

  const summary = (px: string) => (
    <div className="sf-summary">
      <ul className="sf-summary__lines">
        {lines.map(({ product: p, qty }) => (
          <li key={p.id} className="sf-summary__line">
            <span className="sf-summary__pane sf-lit" aria-hidden="true">
              <ProductVisual visual={p.visual} brand={p.brand} bare />
              <span className="sf-summary__qty">{num(qty)}</span>
            </span>
            <span className="sf-summary__name">
              <span className="sf-card__brand"><bdi>{p.brand}</bdi></span>
              {pick(p.name)}
              <span className="sr-only">{tx(`، الكمية ${num(qty)}`, `, quantity ${num(qty)}`)}</span>
            </span>
            <span className="tabular">{money(p.price * qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="sf-totals">
        <div>
          <dt>{tx(`المنتجات (${num(count)})`, `Items (${num(count)})`)}</dt>
          <dd className="tabular">{money(subtotal)}</dd>
        </div>
        {evald.discount > 0 && (
          <div className="sf-totals__save">
            <dt>{tx(`خصم ${code}`, `Discount ${code}`)}</dt>
            <dd className="tabular">−{money(evald.discount)}</dd>
          </div>
        )}
        <div>
          <dt>{gov ? tx(`الشحن لـ ${pick(GOVERNORATES.find((g) => g.id === gov)!.name)}`, `Delivery to ${pick(GOVERNORATES.find((g) => g.id === gov)!.name)}`) : tx('الشحن', 'Delivery')}</dt>
          <dd className="tabular">{shipping === undefined ? tx('اختاري المحافظة', 'Choose governorate') : shipping === 0 ? tx('مجاني', 'Free') : money(shipping)}</dd>
        </div>
        {codFee > 0 && (
          <div>
            <dt>{tx('رسوم الدفع عند الاستلام', 'Cash on delivery fee')}</dt>
            <dd className="tabular">{money(codFee)}</dd>
          </div>
        )}
        <div className="sf-totals__total">
          <dt>{tx('الإجمالي', 'Total')}</dt>
          <dd className="tabular">{money(total)}</dd>
        </div>
      </dl>
      {gov && !freeShip && (
        <p className="sf-small sf-muted">
          {tx(`فاضلك ${money(zone.freeOver - subtotal)} والشحن يبقى مجاني لـ ${zone.name.ar}.`, `Add ${money(zone.freeOver - subtotal)} more for free delivery to ${zone.name.en}.`)}
        </p>
      )}
      <div className="sf-code">
        <label htmlFor={`${px}-code`}>{tx('كود خصم', 'Discount code')}</label>
        <div className="sf-code__row">
          <input
            id={`${px}-code`}
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyCode()
              }
            }}
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={codeMsg ? `${px}-code-msg` : undefined}
          />
          <button type="button" className="sf-btn sf-btn--quiet" onClick={applyCode}>
            {tx('طبّقي الكود', 'Apply code')}
          </button>
        </div>
        {codeMsg && (
          <p className="sf-field__err" id={`${px}-code-msg`} role="alert">
            {codeMsg}
          </p>
        )}
        {code && evald.valid && (
          <p className="sf-field__ok" role="status">
            {evald.freeShipping ? tx(`الكود ${code} اتطبّق: شحن مجاني.`, `${code} applied: free delivery.`) : tx(`الكود ${code} اتطبّق: وفّرتي ${money(evald.discount)}.`, `${code} applied: you save ${money(evald.discount)}.`)}{' '}
            <button
              type="button"
              className="sf-textbtn sf-small"
              onClick={() => {
                setCode(undefined)
                setCodeInput('')
              }}
            >
              {tx('شيلي الكود', 'Remove code')}
            </button>
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="sf-wrap sf-page sf-checkout">
      <h1 className="sf-h1">{tx('إتمام الطلب', 'Checkout')}</h1>
      <details className="sf-checkout__mobilesum sf-only-mobile">
        <summary>
          <span>{tx(`ملخص الطلب (${num(count)})`, `Order summary (${num(count)})`)}</span>
          <strong className="tabular">{money(total)}</strong>
        </summary>
        {summary('m')}
      </details>

      <div className="sf-checkout__grid">
        <form ref={formRef} className="sf-form" onSubmit={submit} noValidate>
          <fieldset className="sf-form__group">
            <legend className="sf-formh">{tx('بيانات التوصيل', 'Delivery details')}</legend>
            <div className="sf-field">
              <label htmlFor="f-name">{tx('الاسم', 'Full name')}</label>
              <input id="f-name" name="name" autoComplete="name" value={name} onChange={(e) => { setName(e.target.value); clearErr('name') }} {...aria('name')} />
              {err('name')}
            </div>
            <div className="sf-field">
              <label htmlFor="f-phone">{tx('رقم الموبايل', 'Mobile number')}</label>
              <input
                id="f-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                dir="ltr"
                placeholder="01X XXXX XXXX"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); clearErr('phone') }}
                onBlur={() => {
                  if (phone && !PHONE_RE.test(normalizePhone(phone))) setErrors((x) => ({ ...x, phone: validate().phone }))
                  else setErrors((x) => ({ ...x, phone: undefined }))
                }}
                {...aria('phone')}
              />
              <p className="sf-field__hint">{tx('هنأكد الطلب معاكي على واتساب على الرقم ده.', 'We confirm the order with you on WhatsApp at this number.')}</p>
              {err('phone')}
            </div>
            <div className="sf-field">
              <label htmlFor="f-gov">{tx('المحافظة', 'Governorate')}</label>
              <select id="f-gov" name="gov" value={gov} onChange={(e) => { setGov(e.target.value); clearErr('gov') }} autoComplete="address-level1" {...aria('gov')}>
                <option value="">{tx('اختاري المحافظة', 'Choose governorate')}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {pick(g.name)}
                  </option>
                ))}
              </select>
              {gov && (
                <p className="sf-field__hint">
                  {tx(`التوصيل خلال ${num(zone.etaDays[0])}–${num(zone.etaDays[1])} يوم عمل.`, `Delivery in ${num(zone.etaDays[0])}–${num(zone.etaDays[1])} working days.`)}
                </p>
              )}
              {err('gov')}
            </div>
            <div className="sf-field">
              <label htmlFor="f-address">{tx('العنوان بالتفصيل', 'Full address')}</label>
              <textarea id="f-address" name="address" rows={3} autoComplete="street-address" value={address} onChange={(e) => { setAddress(e.target.value); clearErr('address') }} {...aria('address')} />
              {err('address')}
            </div>
            <div className="sf-field">
              <label htmlFor="f-email">
                {tx('الإيميل', 'Email')} <span className="sf-muted">{tx('(اختياري)', '(optional)')}</span>
              </label>
              <input id="f-email" name="email" type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => { setEmail(e.target.value); clearErr('email') }} {...aria('email')} />
              {err('email')}
            </div>
          </fieldset>

          <fieldset className="sf-form__group">
            <legend className="sf-formh">{tx('طريقة الدفع', 'Payment')}</legend>
            <div className="sf-pay">
              {methods.map((m) => (
                <label key={m.id} className="sf-pay__opt" data-disabled={m.disabled || undefined}>
                  <input type="radio" name="payment" value={m.id} checked={method === m.id} disabled={m.disabled} onChange={() => setPayment(m.id)} />
                  <span className="sf-pay__text">
                    <span className="sf-pay__label">{m.label}</span>
                    <span className="sf-pay__note">{m.note}</span>
                  </span>
                  <span className="sf-pay__icon">{m.icon}</span>
                </label>
              ))}
            </div>
            {method !== 'cod' && (
              <p className="sf-note">
                {tx(
                  'الدفع الإلكتروني لسه في وضع تجريبي: مش هنطلب بيانات كارت ومفيش فلوس هتتخصم. الطلب هيتسجّل كمدفوع عشان تقدري تتابعيه.',
                  'Online payment is in demo mode: we will not ask for card details and no money is charged. The order is recorded as paid so you can follow it.',
                )}
              </p>
            )}
          </fieldset>

          <div className="sf-form__submit">
            <div className="sf-row sf-row--between sf-only-mobile">
              <span>{tx('الإجمالي', 'Total')}</span>
              <strong className="tabular">{money(total)}</strong>
            </div>
            <button type="submit" className="sf-btn sf-btn--lemon sf-btn--block sf-btn--xl">
              {method === 'cod' ? tx('اطلبي دلوقتي', 'Place order') : tx('اطلبي دلوقتي (تجريبي)', 'Place demo order')}
              <Arrow size={20} />
            </button>
            <p className="sf-form__fine">
              {method === 'cod'
                ? tx(`هتدفعي ${money(total)} كاش للمندوب لما الطلب يوصل. مفيش حساب ولا باسورد، وهنبعتلك تأكيد على واتساب.`, `You pay ${money(total)} in cash when it arrives. No account or password needed; we confirm on WhatsApp.`)
                : tx('مفيش حساب ولا باسورد. هنبعتلك تأكيد على واتساب.', 'No account or password needed. We send a confirmation on WhatsApp.')}
            </p>
          </div>
        </form>

        <aside className="sf-checkout__aside sf-only-desktop" aria-label={tx('ملخص الطلب', 'Order summary')}>
          <h2 className="sf-formh">{tx('ملخص الطلب', 'Order summary')}</h2>
          {summary('d')}
        </aside>
      </div>
    </div>
  )
}
