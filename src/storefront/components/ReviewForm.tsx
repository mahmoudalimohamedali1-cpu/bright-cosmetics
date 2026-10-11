import { useState } from 'react'
import type { FormEvent } from 'react'
import { Star } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { api, ApiError } from '../../lib/api'
import { useRemote } from '../../lib/sync'
import { normalizePhone, PHONE_RE } from '../../lib/commerce'
import type { Review } from '../../data/types'

/*
  "Write a review". Every review is held for the owner's approval in the
  admin (Reviews) before it appears; "verified purchase" is decided by the
  server from the shopper's delivered orders.
*/

type Errors = Partial<Record<'name' | 'phone' | 'rating' | 'body' | 'form', string>>

export function ReviewForm({ productId }: { productId: string }) {
  const { tx, lang, pick } = useI18n()
  const online = useRemote((r) => r.online === true)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const validate = (): Errors => {
    const e: Errors = {}
    if (!name.trim()) e.name = tx('اكتبي اسمك.', 'Please add your name.')
    if (!PHONE_RE.test(normalizePhone(phone))) e.phone = tx('رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.', 'Mobile must be 11 digits starting 010, 011, 012 or 015.')
    if (rating < 1) e.rating = tx('اختاري عدد النجوم.', 'Choose a star rating.')
    if (body.trim().length < 10) e.body = tx('اكتبي رأيك في سطر على الأقل.', 'Write at least a line.')
    return e
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setSending(true)
    try {
      if (online) {
        await api('/api/reviews', { body: { productId, name: name.trim(), phone: normalizePhone(phone), rating, body: body.trim(), lang } })
      } else {
        // Demo mode without the server: keep it in this browser, pending approval
        const r: Review = {
          id: 'rv' + Math.random().toString(36).slice(2, 9),
          productId,
          customerId: '',
          rating,
          title: '',
          body: body.trim(),
          lang,
          createdAt: new Date().toISOString(),
          status: 'pending',
          skinType: 'normal',
          verified: false,
        }
        useStore.setState((s) => ({ reviews: [r, ...s.reviews] }))
      }
      setDone(true)
    } catch (err) {
      const field = err instanceof ApiError ? (err.detail.field as keyof Errors | undefined) : undefined
      const msg = err instanceof ApiError ? pick(err.bi) : tx('حصل خطأ. جرّبي تاني.', 'Something went wrong. Please try again.')
      setErrors({ [field ?? 'form']: msg })
    } finally {
      setSending(false)
    }
  }

  if (done)
    return (
      <div className="sf-rform sf-rform--done" role="status">
        <p className="sf-rform__h">{tx('شكرًا! وصلنا تقييمك.', 'Thank you, your review is in.')}</p>
        <p className="sf-muted">{tx('هيظهر هنا أول ما فريق برايت يراجعه.', 'It appears here once the Bright team has checked it.')}</p>
      </div>
    )

  if (!open)
    return (
      <button type="button" className="sf-btn sf-btn--quiet" onClick={() => setOpen(true)}>
        {tx('اكتبي تقييمك', 'Write a review')}
      </button>
    )

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p className="sf-field__err" id={`rf-err-${k}`} role="alert">
        {errors[k]}
      </p>
    ) : null
  const shown = hover || rating

  return (
    <form className="sf-rform" onSubmit={submit} noValidate>
      <p className="sf-rform__h">{tx('تقييمك للمنتج', 'Your review')}</p>
      <fieldset className="sf-field sf-rform__stars">
        <legend>{tx('كام نجمة؟', 'How many stars?')}</legend>
        <div className="sf-rform__row" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="sf-rform__star" data-on={n <= shown || undefined} onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => {
                  setRating(n)
                  setErrors((x) => ({ ...x, rating: undefined }))
                }}
                className="sr-only"
              />
              <Star size={28} aria-hidden="true" />
              <span className="sr-only">{tx(`${n} من 5`, `${n} of 5`)}</span>
            </label>
          ))}
        </div>
        {err('rating')}
      </fieldset>
      <div className="sf-field">
        <label htmlFor="rf-body">{tx('رأيك', 'Your thoughts')}</label>
        <textarea id="rf-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body || undefined} aria-describedby={errors.body ? 'rf-err-body' : undefined} />
        {err('body')}
      </div>
      <div className="sf-rform__two">
        <div className="sf-field">
          <label htmlFor="rf-name">{tx('اسمك', 'Your name')}</label>
          <input id="rf-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name || undefined} />
          {err('name')}
        </div>
        <div className="sf-field">
          <label htmlFor="rf-phone">{tx('رقم الموبايل', 'Mobile number')}</label>
          <input id="rf-phone" type="tel" inputMode="tel" dir="ltr" autoComplete="tel-national" placeholder="01X XXXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone || undefined} />
          <p className="sf-field__hint">{tx('مش هيظهر لحد. بنستخدمه نتأكد إنك اشتريتي المنتج.', 'Never shown. We use it to confirm you bought this product.')}</p>
          {err('phone')}
        </div>
      </div>
      {err('form')}
      <button type="submit" className="sf-btn sf-btn--lemon" disabled={sending} aria-busy={sending || undefined}>
        {sending ? tx('بنبعته…', 'Sending…') : tx('ابعتي التقييم', 'Send review')}
      </button>
    </form>
  )
}
