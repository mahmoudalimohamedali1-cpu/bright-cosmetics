import { api, ApiError } from '../../../lib/api'

/*
  Product photos. Before upload a photo is resized (longest side 1600 px) and
  re-encoded as WebP, so a 6 MB phone photo becomes a few hundred KB and the
  shop stays fast. Transparent PNG packshots keep their transparency (WebP has
  alpha). With a server the file goes to /api/admin/uploads; in demo mode (no
  server) it is kept in the browser as a smaller data URL.
*/

export const MAX_PHOTOS = 8

export class PhotoError extends Error {
  bi: { ar: string; en: string }
  constructor(bi: { ar: string; en: string }) {
    super(bi.en)
    this.bi = bi
  }
}

async function encode(file: File, max: number, quality: number): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new PhotoError({ ar: 'الملف ده مش صورة.', en: 'This file is not an image.' })
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    // e.g. HEIC from an iPhone in a browser that cannot read it
    throw new PhotoError({ ar: 'الصيغة دي مش مدعومة. استخدمي JPG أو PNG أو WebP.', en: 'This format is not supported. Use JPG, PNG or WebP.' })
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality))
  if (webp && webp.type === 'image/webp') return webp
  // Browsers that cannot encode WebP: PNG keeps transparency.
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!png) throw new PhotoError({ ar: 'الصورة ما اتجهزتش. جرّبي صورة تانية.', en: 'The image could not be prepared. Try another one.' })
  return png
}

const asDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(b)
  })

/** Prepare and store one photo; returns the path (or data URL in demo mode) to save on the product. */
export async function addPhoto(file: File, online: boolean): Promise<string> {
  if (!online) return asDataUrl(await encode(file, 900, 0.8))
  const blob = await encode(file, 1600, 0.86)
  const form = new FormData()
  form.append('file', blob, blob.type === 'image/webp' ? 'photo.webp' : 'photo.png')
  try {
    const r = await api<{ url: string }>('/api/admin/uploads', { body: form, admin: true })
    return r.url
  } catch (e) {
    throw new PhotoError(e instanceof ApiError ? e.bi : { ar: 'الصورة ما اترفعتش.', en: 'The photo was not uploaded.' })
  }
}
