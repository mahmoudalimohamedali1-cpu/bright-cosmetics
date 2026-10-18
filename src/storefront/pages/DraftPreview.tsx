import { useEffect, useState } from 'react'
import type { Product } from '../../data/types'
import { useI18n } from '../../i18n'
import { ProductView } from './ProductPage'

const KEY = 'bright-product-preview'

function parse(raw: string | null): Product | undefined {
  if (!raw) return undefined
  try {
    const p = JSON.parse(raw) as Product
    return p && typeof p === 'object' && typeof p.id === 'string' && p.name && typeof p.name === 'object' ? p : undefined
  } catch {
    return undefined
  }
}

function readDraft(): Product | undefined {
  try {
    return parse(localStorage.getItem(KEY))
  } catch {
    return undefined
  }
}

/** Storefront look of a product draft. Nothing here is saved. */
export default function DraftPreview() {
  const { tx } = useI18n()
  const [draft, setDraft] = useState<Product | undefined>(readDraft)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin) return
      const data = e.data as { type?: string; product?: Product }
      if (data?.type === KEY && data.product?.id) setDraft(data.product)
    }
    // Another click on "Preview" while this tab is open.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return
      const next = parse(e.newValue)
      if (next) setDraft(next)
    }
    window.addEventListener('message', onMessage)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  if (!draft) {
    return (
      <div className="sf-wrap sf-page">
        <h1 className="sf-h1">{tx('مفيش معاينة', 'No preview')}</h1>
        <p className="sf-muted">{tx('ارجعي لصفحة المنتج في الأدمن واضغطي معاينة قبل الحفظ.', 'Go back to the product in admin and choose Preview before save.')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="sf-previewbar" role="status">
        {tx('معاينة قبل الحفظ. المتجر لسه ما اتغيرش، والسلة مش هتتأثر.', 'Preview before save. The store has not changed, and the bag is not affected.')}
      </div>
      <ProductView key={JSON.stringify(draft)} id={draft.id} draft={draft} />
    </>
  )
}
