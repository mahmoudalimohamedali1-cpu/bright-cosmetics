import type { ReactNode } from 'react'
import { FlaskConical, PackageCheck, Ship, Store } from 'lucide-react'
import type { Product } from '../../data/types'
import { originName } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { daysUntil, fefoBatches } from '../lib'

/*
  The batch provenance trail: brand origin, import shipment, NURI shelf, and
  the expiry of the exact lot the shopper will receive (FEFO).
*/
export function Provenance({ p, tone = 'paper', compact }: { p: Product; tone?: 'paper' | 'lacquer'; compact?: boolean }) {
  const { tx, date, num } = useI18n()
  const shipments = useStore((s) => s.shipments)
  const lots = fefoBatches(p)
  const lot = lots[0]
  if (!lot) {
    return (
      <div className={`sf-trail sf-trail--${tone}`}>
        <p className="sf-muted">{tx('مفيش تشغيلة متاحة دلوقتي للمنتج ده.', 'No lot is available for this product right now.')}</p>
      </div>
    )
  }
  const sh = shipments.find((s) => s.id === lot.shipmentId)
  const supplierOk = sh && sh.origin === p.origin
  const dispatched = sh && supplierOk && sh.createdAt < lot.receivedAt ? sh.createdAt : undefined
  const left = daysUntil(lot.expiry)
  const months = Math.floor(left / 30)
  const country = originName(p.origin)
  const next = lots[1]

  const stops = [
    {
      icon: <FlaskConical size={18} aria-hidden="true" />,
      title: tx(`من ${country.ar}`, `From ${country.en}`),
      line: (
        <>
          <bdi>{p.brand}</bdi>
          {supplierOk ? (
            <>
              {tx('، عن طريق ', ', via ')}
              <bdi>{sh!.supplier}</bdi>
            </>
          ) : (
            tx('، موزّع معتمد', ', authorised supplier')
          )}
        </>
      ) as ReactNode,
      when: undefined as string | undefined,
    },
    {
      icon: <Ship size={18} aria-hidden="true" />,
      title: tx('شحنة الاستيراد', 'Import shipment'),
      line: tx(`شحنة ${lot.shipmentId.toUpperCase()}`, `Shipment ${lot.shipmentId.toUpperCase()}`),
      when: dispatched ? tx(`اتشحنت ${date(dispatched)}`, `Dispatched ${date(dispatched)}`) : undefined,
    },
    {
      icon: <Store size={18} aria-hidden="true" />,
      title: tx('على رف نوري', 'On the NURI shelf'),
      line: tx(`تشغيلة ${lot.lot}`, `Lot ${lot.lot}`),
      when: tx(`وصلت ${date(lot.receivedAt)}`, `Received ${date(lot.receivedAt)}`),
    },
    {
      icon: <PackageCheck size={18} aria-hidden="true" />,
      title: tx('العبوة اللي هتوصلك', 'The unit you receive'),
      line: tx(`صالحة لحد ${date(lot.expiry, { day: 'numeric', month: 'long', year: 'numeric' })}`, `Good until ${date(lot.expiry, { day: 'numeric', month: 'long', year: 'numeric' })}`),
      when:
        months >= 1
          ? tx(`باقي ${num(months)} شهر على الانتهاء`, `${num(months)} months before expiry`)
          : tx(`باقي ${num(left)} يوم على الانتهاء`, `${num(left)} days before expiry`),
    },
  ]

  return (
    <div className={`sf-trail sf-trail--${tone}${compact ? ' sf-trail--compact' : ''}`}>
      <ol className="sf-trail__stops">
        {stops.map((s, i) => (
          <li key={i} className="sf-trail__stop" data-last={i === stops.length - 1 || undefined}>
            <span className="sf-trail__icon">{s.icon}</span>
            <span className="sf-trail__title">{s.title}</span>
            <span className="sf-trail__line">
              {s.line}
            </span>
            {s.when && <span className="sf-trail__when">{s.when}</span>}
          </li>
        ))}
      </ol>
      {!compact && (
        <p className="sf-trail__note">
          {tx(
            'بنشحن دايمًا من التشغيلة الأقرب في الصلاحية الأول، وده التاريخ اللي هتلاقيه مطبوع على العبوة.',
            'We always ship the earliest-expiring lot first, and this is the date printed on the unit you get.',
          )}
          {next &&
            tx(
              ` لو طلبتي أكتر من ${num(lot.qty)}، الباقي من تشغيلة ${next.lot} صالحة لحد ${date(next.expiry, { month: 'long', year: 'numeric' })}.`,
              ` If you order more than ${num(lot.qty)}, the rest comes from lot ${next.lot}, good until ${date(next.expiry, { month: 'long', year: 'numeric' })}.`,
            )}
        </p>
      )}
    </div>
  )
}
