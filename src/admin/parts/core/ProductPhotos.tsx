import { useId, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Star, Trash2 } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { asset } from '../../../lib/asset'
import { useAdmin } from '../../ui'
import { addPhoto, MAX_PHOTOS, PhotoError } from './photos'

/**
 * The product's photos: the first is the main one (card and product page), the
 * rest are the gallery. Add by button or by dropping files; reorder; remove.
 */
export function ProductPhotos({ photos, onChange, disabled }: { photos: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const { tx, num, dir } = useI18n()
  const { toast, online } = useAdmin()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [over, setOver] = useState(false)
  // Latest list while several uploads finish one after another.
  const latest = useRef(photos)
  latest.current = photos

  const add = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (!list.length) return
    const room = MAX_PHOTOS - latest.current.length
    if (room <= 0) {
      toast(tx(`أقصى عدد ${num(MAX_PHOTOS)} صور للمنتج.`, `${MAX_PHOTOS} photos per product at most.`))
      return
    }
    const take = list.slice(0, room)
    if (list.length > room) toast(tx(`اتضافت أول ${num(room)} بس: أقصى عدد ${num(MAX_PHOTOS)} صور.`, `Only the first ${room} were added: ${MAX_PHOTOS} photos at most.`))
    setBusy((n) => n + take.length)
    for (const f of take) {
      try {
        const url = await addPhoto(f, !!online)
        latest.current = [...latest.current, url]
        onChange(latest.current)
      } catch (e) {
        const bi = e instanceof PhotoError ? e.bi : { ar: 'الصورة ما اتضافتش.', en: 'The photo was not added.' }
        toast(tx(`${f.name}: ${bi.ar}`, `${f.name}: ${bi.en}`))
      } finally {
        setBusy((n) => n - 1)
      }
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= photos.length) return
    const next = photos.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const makeMain = (i: number) => onChange([photos[i], ...photos.filter((_, k) => k !== i)])
  const remove = (i: number) => onChange(photos.filter((_, k) => k !== i))

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (!disabled && e.dataTransfer.files.length) void add(e.dataTransfer.files)
  }
  // In RTL the "earlier" arrow points right.
  const Earlier = dir === 'rtl' ? ChevronRight : ChevronLeft
  const Later = dir === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div
      className="core-photos"
      data-over={over || undefined}
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {photos.length > 0 && (
        <ul className="core-photos__grid" aria-label={tx('صور المنتج', 'Product photos')}>
          {photos.map((src, i) => (
            <li key={`${src.slice(0, 60)}-${i}`} className="core-photos__item" data-main={i === 0 || undefined}>
              <img src={asset(src)} alt={i === 0 ? tx('الصورة الرئيسية', 'Main photo') : tx(`صورة ${num(i + 1)}`, `Photo ${i + 1}`)} loading="lazy" decoding="async" />
              {i === 0 && <span className="core-photos__badge">{tx('الرئيسية', 'Main')}</span>}
              {!disabled && (
                <span className="core-photos__tools">
                  {i > 0 && (
                    <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => makeMain(i)} aria-label={tx(`خلي صورة ${num(i + 1)} الرئيسية`, `Make photo ${i + 1} the main one`)} title={tx('خليها الرئيسية', 'Make main')}>
                      <Star size={14} aria-hidden />
                    </button>
                  )}
                  <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={tx(`قدّمي صورة ${num(i + 1)}`, `Move photo ${i + 1} earlier`)}>
                    <Earlier size={14} aria-hidden />
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label={tx(`أخّري صورة ${num(i + 1)}`, `Move photo ${i + 1} later`)}>
                    <Later size={14} aria-hidden />
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm btn--icon btn--danger" onClick={() => remove(i)} aria-label={tx(`احذفي صورة ${num(i + 1)}`, `Remove photo ${i + 1}`)}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (
        <div className="core-photos__add">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void add(e.target.files)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn" onClick={() => inputRef.current?.click()} disabled={busy > 0 || photos.length >= MAX_PHOTOS} aria-busy={busy > 0 || undefined}>
            <ImagePlus size={16} aria-hidden />
            {busy > 0 ? tx(`بيترفع ${num(busy)}…`, `Uploading ${busy}…`) : photos.length ? tx('ضيفي صور', 'Add photos') : tx('ضيفي صور المنتج', 'Add product photos')}
          </button>
          <span className="small muted">
            {tx(`أو اسحبي الصور هنا. لحد ${num(MAX_PHOTOS)} صور، والأولى هي اللي بتظهر في الكارت. JPG أو PNG أو WebP، وبنصغّرها لوحدها.`, `Or drop them here. Up to ${MAX_PHOTOS}; the first one shows on the card. JPG, PNG or WebP, resized for you.`)}
          </span>
        </div>
      )}
      {!photos.length && disabled && <p className="small muted">{tx('مفيش صور للمنتج ده.', 'This product has no photos.')}</p>}
    </div>
  )
}
