import type { Customer, Order } from '../../src/data/types'
import { GOVERNORATES } from '../../src/data/seed'
import { env } from '../env'
import { ProviderError } from '../http'

/*
  Bosta courier: create a delivery for an order.
  Docs: https://docs.bosta.co  (POST /api/v2/deliveries, header Authorization: <API key>)
  type 10 = "Send" (forward delivery). `cod` is the cash the courier collects.
  City names follow Bosta's English city list; check them against
  GET /api/v2/cities for your account before going live.
*/

export const BOSTA_VARS = ['BOSTA_API_KEY']

/** Bosta city names differ from ours in a few places. */
const CITY: Record<string, string> = { qlb: 'Qalyubia', kfs: 'Kafr Alsheikh', bns: 'Bani Suif', rsa: 'Red Sea', ssn: 'South Sinai', nsn: 'North Sinai', wad: 'New Valley', mtr: 'Matrouh' }

export async function createDelivery(order: Order, customer: Customer) {
  const gov = GOVERNORATES.find((g) => g.id === order.governorateId)
  const [firstName, ...rest] = (customer.name.en || customer.name.ar).split(' ')
  const items = order.lines.reduce((s, l) => s + l.qty, 0)
  const cod = order.payment === 'cod' && order.paymentStatus !== 'paid' ? order.total : 0
  const body = {
    type: 10,
    specs: { packageType: 'Parcel', size: 'SMALL', packageDetails: { itemsCount: items, description: `Bright order #${order.number}` } },
    notes: order.note ?? '',
    cod,
    dropOffAddress: { city: CITY[order.governorateId] ?? gov?.name.en ?? 'Cairo', firstLine: order.address },
    receiver: { firstName: firstName || 'Bright', lastName: rest.join(' ') || 'Customer', phone: customer.phone, email: customer.email || undefined },
    businessReference: `BRIGHT-${order.number}`,
  }
  const r = await fetch(`${env.bosta.baseUrl}/deliveries`, {
    method: 'POST',
    headers: { authorization: env.bosta.apiKey!, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await r.json().catch(() => undefined)) as { success?: boolean; data?: { _id?: string; trackingNumber?: string | number } } | undefined
  const tracking = data?.data?.trackingNumber
  if (!r.ok || data?.success === false || !tracking) throw new ProviderError('Bosta delivery failed', r.status, data)
  return { tracking: String(tracking), deliveryId: data?.data?._id }
}
