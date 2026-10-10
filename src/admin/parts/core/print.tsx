import { useStore } from '../../../store'
import type { Order } from '../../../data/types'
import { gov, PAYMENT_LABEL } from './lib'

/* Print-only sheets. Always bilingual: the courier, the packer and the customer
   may each read a different language. Western digits, EGP in both. */

const egp = (n: number) => `EGP ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(Math.round(n))}`
const d = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

function useLookups() {
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  return { products, customers, settings }
}

export function PackingSlips({ orders }: { orders: Order[] }) {
  const { products, customers, settings } = useLookups()
  return (
    <div className="print-sheet" aria-hidden>
      {orders.map((o) => {
        const c = customers.find((x) => x.id === o.customerId)
        const g = gov(o.governorateId)
        const codDue = o.payment === 'cod' && o.paymentStatus === 'pending'
        return (
          <section className="print-page" key={o.id}>
            <div className="print-head">
              <div>
                <h1>
                  {settings.storeName.en} / {settings.storeName.ar}
                </h1>
                <div>Packing slip / قائمة التعبئة</div>
              </div>
              <div style={{ textAlign: 'end' }}>
                <strong style={{ fontSize: 18 }}>#{o.number}</strong>
                <div>{d(o.createdAt)}</div>
                {o.courier && <div>{o.courier}</div>}
              </div>
            </div>
            <div className="print-bi">
              <div>
                <strong>Ship to</strong>
                <div>{c?.name.en}</div>
                <div>{c?.phone}</div>
                <div>{g?.name.en}</div>
              </div>
              <div dir="rtl">
                <strong>الشحن إلى</strong>
                <div>{c?.name.ar}</div>
                <div>{o.address}</div>
                <div>{g?.name.ar}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Item / المنتج</th>
                  <th>Lot / التشغيلة</th>
                  <th className="t-num">Qty / الكمية</th>
                </tr>
              </thead>
              <tbody>
                {o.lines.map((l) => {
                  const p = products.find((x) => x.id === l.productId)
                  const b = p?.batches.find((x) => x.id === l.batchId)
                  return (
                    <tr key={l.productId}>
                      <td>{p?.sku}</td>
                      <td>
                        {p?.brand} {p?.name.en}
                        <div dir="rtl">{p?.name.ar}</div>
                      </td>
                      <td>{b ? `${b.lot} (exp ${d(b.expiry)})` : '—'}</td>
                      <td className="t-num">{l.qty}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p>
              <strong>{codDue ? `Collect on delivery / مطلوب تحصيل: ${egp(o.total)}` : 'Prepaid, collect nothing / مدفوع مسبقًا، لا يوجد تحصيل'}</strong>
            </p>
            {o.note && <p>Note / ملاحظة: {o.note}</p>}
          </section>
        )
      })}
    </div>
  )
}

export function Invoice({ order: o }: { order: Order }) {
  const { products, customers, settings } = useLookups()
  const c = customers.find((x) => x.id === o.customerId)
  const g = gov(o.governorateId)
  const rows: [string, string, number][] = [
    ['Subtotal', 'المجموع الفرعي', o.subtotal],
    ...(o.discount ? ([[`Discount${o.discountCode ? ` (${o.discountCode})` : ''}`, 'الخصم', -o.discount]] as [string, string, number][]) : []),
    ['Shipping', 'الشحن', o.shipping],
    ...(o.codFee ? ([['COD fee', 'رسوم الدفع عند الاستلام', o.codFee]] as [string, string, number][]) : []),
  ]
  return (
    <div className="print-sheet" aria-hidden>
      <section className="print-page">
        <div className="print-head">
          <div>
            <h1>
              {settings.storeName.en} / {settings.storeName.ar}
            </h1>
            <div>{settings.email}</div>
            <div>{settings.phone}</div>
          </div>
          <div style={{ textAlign: 'end' }}>
            <div>Invoice / فاتورة</div>
            <strong style={{ fontSize: 18 }}>#{o.number}</strong>
            <div>{d(o.createdAt)}</div>
          </div>
        </div>
        <div className="print-bi">
          <div>
            <strong>Bill to</strong>
            <div>{c?.name.en}</div>
            <div>{c?.phone}</div>
            <div>{g?.name.en}</div>
            <div>{PAYMENT_LABEL[o.payment].en}</div>
          </div>
          <div dir="rtl">
            <strong>العميل</strong>
            <div>{c?.name.ar}</div>
            <div>{o.address}</div>
            <div>{g?.name.ar}</div>
            <div>{PAYMENT_LABEL[o.payment].ar}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item / المنتج</th>
              <th>Lot / التشغيلة</th>
              <th className="t-num">Qty</th>
              <th className="t-num">Unit / سعر الوحدة</th>
              <th className="t-num">Total / الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {o.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId)
              const b = p?.batches.find((x) => x.id === l.batchId)
              return (
                <tr key={l.productId}>
                  <td>
                    {p?.brand} {p?.name.en}
                    <div dir="rtl">{p?.name.ar}</div>
                  </td>
                  <td>{b ? `${b.lot}, exp ${d(b.expiry)}` : '—'}</td>
                  <td className="t-num">{l.qty}</td>
                  <td className="t-num">{egp(l.price)}</td>
                  <td className="t-num">{egp(l.price * l.qty)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <table style={{ width: '50%', marginInlineStart: 'auto' }}>
          <tbody>
            {rows.map(([en, ar, v]) => (
              <tr key={en}>
                <td>
                  {en} / {ar}
                </td>
                <td className="t-num">{v < 0 ? `−${egp(-v)}` : egp(v)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total / الإجمالي</strong>
              </td>
              <td className="t-num">
                <strong>{egp(o.total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
        <p>
          {settings.taxIncluded ? `Prices include ${settings.vatRate}% VAT / الأسعار شاملة ضريبة القيمة المضافة ${settings.vatRate}٪` : ''}
        </p>
        <p>Every unit carries its lot number and expiry date. / كل عبوة عليها رقم التشغيلة وتاريخ الصلاحية.</p>
      </section>
    </div>
  )
}
