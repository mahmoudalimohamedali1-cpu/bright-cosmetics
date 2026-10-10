import type { Bi } from '../../../i18n'
import type { Channel, Order, OrderEvent, PaymentMethod, Product, Shipment } from '../../../data/types'
import { GOVERNORATES } from '../../../data/seed'
import { DAY } from '../../../lib/rand'

/* Shared helpers for the core admin pages (overview, orders, products, inventory, live). */

export const COURIERS = ['Bosta', 'Aramex', 'J&T', 'Mylerz'] as const
export type Courier = (typeof COURIERS)[number]

export const LEAD_DAYS = 21
export const TARGET_DAYS = 60

export function gov(id: string) {
  return GOVERNORATES.find((g) => g.id === id)
}

export const CHANNEL_LABEL: Record<Channel, Bi> = {
  web: { ar: 'المتجر', en: 'Online store' },
  instagram: { ar: 'إنستجرام', en: 'Instagram' },
  tiktok: { ar: 'تيك توك', en: 'TikTok' },
  whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  pos: { ar: 'نقطة بيع', en: 'Point of sale' },
}

export const PAYMENT_LABEL: Record<PaymentMethod, Bi> = {
  cod: { ar: 'الدفع عند الاستلام', en: 'Cash on delivery' },
  card: { ar: 'بطاقة', en: 'Card' },
  wallet: { ar: 'محفظة إلكترونية', en: 'Mobile wallet' },
  instapay: { ar: 'إنستاباي', en: 'InstaPay' },
}

export const EVENT_LABEL: Record<OrderEvent['type'], Bi> = {
  placed: { ar: 'تم استلام الطلب', en: 'Order placed' },
  confirmed: { ar: 'تأكيد الطلب', en: 'Order confirmed' },
  whatsapp_confirmed: { ar: 'تأكيد الطلب على واتساب', en: 'Confirmed on WhatsApp' },
  paid: { ar: 'تحصيل المبلغ', en: 'Payment collected' },
  packed: { ar: 'تجهيز الطلب', en: 'Packed' },
  shipped: { ar: 'تسليم لشركة الشحن', en: 'Handed to courier' },
  delivered: { ar: 'تسليم للعميل', en: 'Delivered' },
  cancelled: { ar: 'إلغاء الطلب', en: 'Cancelled' },
  returned: { ar: 'استلام مرتجع', en: 'Returned' },
  refunded: { ar: 'استرداد المبلغ', en: 'Refunded' },
  note: { ar: 'ملاحظة', en: 'Note' },
}

export const SHIPMENT_STATUS: Record<Shipment['status'], Bi & { tone: 'ok' | 'warn' | 'info' | undefined }> = {
  ordered: { ar: 'تم الطلب من المورّد', en: 'Ordered', tone: undefined },
  in_transit: { ar: 'في الطريق', en: 'In transit', tone: 'info' },
  customs: { ar: 'في الجمارك', en: 'In customs', tone: 'warn' },
  received: { ar: 'تم الاستلام', en: 'Received', tone: 'ok' },
}

/* ───── Order saved views ───── */

export type OrderView = 'all' | 'confirm' | 'pack' | 'shipped' | 'cod' | 'returns' | 'cancelled'

export function normalizeView(v: string | null): OrderView {
  if (v === 'unfulfilled' || v === 'to_pack') return 'pack'
  const all: OrderView[] = ['all', 'confirm', 'pack', 'shipped', 'cod', 'returns', 'cancelled']
  return all.includes(v as OrderView) ? (v as OrderView) : 'all'
}

export function inView(o: Order, v: OrderView) {
  switch (v) {
    case 'all':
      return true
    case 'confirm':
      return o.status === 'open'
    case 'pack':
      return o.status === 'confirmed' && (o.fulfillment === 'unfulfilled' || o.fulfillment === 'packed')
    case 'shipped':
      return o.status !== 'cancelled' && o.fulfillment === 'shipped'
    case 'cod':
      return o.status !== 'cancelled' && o.payment === 'cod' && o.paymentStatus === 'pending' && (o.fulfillment === 'shipped' || o.fulfillment === 'delivered')
    case 'returns':
      return o.status !== 'cancelled' && (o.fulfillment === 'returned' || o.paymentStatus === 'refunded' || o.paymentStatus === 'partially_refunded')
    case 'cancelled':
      return o.status === 'cancelled'
  }
}

export const units = (o: Order) => o.lines.reduce((s, l) => s + l.qty, 0)

/* ───── Export ───── */

/** Real CSV download. BOM so Excel opens Arabic text correctly. */
export function downloadCSV(filename: string, rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const today = () => new Date().toISOString().slice(0, 10)

/* ───── WhatsApp ───── */

/** Egyptian mobile 01xxxxxxxxx → wa.me/201xxxxxxxxx */
export function waNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('20')) return d
  if (d.startsWith('0')) return `20${d.slice(1)}`
  return `20${d}`
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`
}

/* ───── Stock ───── */

export function incomingUnits(productId: string, shipments: Shipment[]) {
  return shipments
    .filter((s) => s.status !== 'received')
    .reduce((sum, s) => sum + s.lines.filter((l) => l.productId === productId).reduce((a, l) => a + l.qty, 0), 0)
}

/** Landed cost per unit: goods cost plus freight and customs, allocated by line value. */
export function landedLines(s: Shipment) {
  const goods = s.lines.reduce((a, l) => a + l.unitCost * l.qty, 0)
  const extras = s.freight + s.customs
  return {
    goods,
    extras,
    units: s.lines.reduce((a, l) => a + l.qty, 0),
    lines: s.lines.map((l) => ({ ...l, landed: goods ? l.unitCost * (1 + extras / goods) : l.unitCost })),
  }
}

export type StockState = 'out' | 'low' | 'ok'
export function stockState(p: Product, onHand: number): StockState {
  if (onHand <= 0) return 'out'
  if (onHand <= p.lowStockAt) return 'low'
  return 'ok'
}

export const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000
export const daysAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY
