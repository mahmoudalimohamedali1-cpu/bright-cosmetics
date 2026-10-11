import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Customer, Order } from '../../src/data/types'
import { GOVERNORATES } from '../../src/data/seed'
import { env } from '../env'
import { ProviderError } from '../http'

/*
  Paymob (Egypt) via the Intention API + Unified Checkout.
  Docs: https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention
  - POST {base}/v1/intention/  with  Authorization: Token <secret key>
    amount in piasters (cents), payment_methods = integration ids,
    special_reference comes back as merchant_order_id in the callback.
  - Customer pays at {base}/unifiedcheckout/?publicKey=…&clientSecret=…
  - Transaction processed callback: POST JSON { type: 'TRANSACTION', obj }
    with ?hmac=…, HMAC-SHA512 (key PAYMOB_HMAC) over the fields below.
*/

export const PAYMOB_VARS = ['PAYMOB_SECRET_KEY', 'PAYMOB_PUBLIC_KEY', 'PAYMOB_INTEGRATION_IDS', 'PAYMOB_HMAC']

/** PAYMOB_INTEGRATION_IDS: "123,456" or labelled "card:123,wallet:456". */
export function integrationIds(method: 'card' | 'wallet'): number[] {
  const entries = (env.paymob.integrationIds ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [a, b] = s.includes(':') ? s.split(':') : [undefined, s]
      return { label: a?.trim().toLowerCase(), id: Number(b) }
    })
    .filter((e) => Number.isInteger(e.id))
  const labelled = entries.filter((e) => e.label === method)
  return (labelled.length ? labelled : entries.filter((e) => !e.label || e.label === method)).map((e) => e.id)
}

export async function createIntention(order: Order, customer: Customer, opts: { method: 'card' | 'wallet'; appUrl: string; fallbackEmail: string }) {
  const [first, ...rest] = (customer.name.en || customer.name.ar || 'NURI customer').split(' ')
  const gov = GOVERNORATES.find((g) => g.id === order.governorateId)
  const amount = Math.round(order.total * 100)
  const body = {
    amount,
    currency: 'EGP',
    payment_methods: integrationIds(opts.method),
    items: [{ name: `NURI order #${order.number}`, amount, description: `${order.lines.length} item(s)`, quantity: 1 }],
    billing_data: {
      first_name: first || 'NA',
      last_name: rest.join(' ') || 'NA',
      phone_number: `+2${customer.phone}`,
      email: customer.email || opts.fallbackEmail,
      street: order.address.slice(0, 120) || 'NA',
      building: 'NA',
      floor: 'NA',
      apartment: 'NA',
      city: gov?.name.en ?? 'NA',
      state: gov?.name.en ?? 'NA',
      country: 'EG',
    },
    // Unique per attempt; the order id is the part before the dot.
    special_reference: `${order.id}.${Date.now().toString(36)}`,
    extras: { order_id: order.id },
    notification_url: `${opts.appUrl}/api/payments/paymob/webhook`,
    redirection_url: `${opts.appUrl}/order/${order.id}`,
  }
  const r = await fetch(`${env.paymob.baseUrl}/v1/intention/`, {
    method: 'POST',
    headers: { authorization: `Token ${env.paymob.secretKey}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await r.json().catch(() => undefined)) as { client_secret?: string; id?: string; intention_order_id?: number } | undefined
  if (!r.ok || !data?.client_secret) throw new ProviderError('Paymob intention failed', r.status, data)
  const url = `${env.paymob.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(env.paymob.publicKey!)}&clientSecret=${encodeURIComponent(data.client_secret)}`
  return { url, intentionId: data.id, paymobOrderId: data.intention_order_id }
}

/** Field order Paymob uses for the transaction-processed callback HMAC. */
const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
]

const at = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((x, k) => (x && typeof x === 'object' ? (x as Record<string, unknown>)[k] : undefined), o)

export function verifyHmac(obj: unknown, received: string | undefined): boolean {
  if (!received || !env.paymob.hmac) return false
  const concat = HMAC_FIELDS.map((f) => {
    const v = at(obj, f)
    return v === undefined || v === null ? '' : String(v)
  }).join('')
  const expected = createHmac('sha512', env.paymob.hmac).update(concat).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(received.toLowerCase(), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

export type PaymobTxn = {
  id: number
  success: boolean
  pending: boolean
  amount_cents: number
  order?: { id?: number; merchant_order_id?: string }
}

/** Our order id from a callback: special_reference "o1234.xyz" comes back as merchant_order_id. */
export function orderIdFrom(obj: PaymobTxn): string | undefined {
  const ref = obj.order?.merchant_order_id
  return typeof ref === 'string' && ref ? ref.split('.')[0] : undefined
}
