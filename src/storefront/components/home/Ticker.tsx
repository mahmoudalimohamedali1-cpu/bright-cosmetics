import { useI18n } from '../../../i18n'
import { useStore } from '../../../store'
import { Marquee } from './Marquee'

/** The lilac claims bar above the header. The admin's announcement leads when set. */
export function Ticker() {
  const { tx, pick, money } = useI18n()
  const announcement = useStore((s) => s.settings.announcement)
  const freeOver = useStore((s) => s.zones[0]?.freeOver ?? 1500)
  const lead = pick(announcement).trim()
  // The admin's announcement (usually the shipping offer) takes the shipping slot.
  const items = [
    tx('أصلي 100%', '100% authentic'),
    tx('الدفع عند الاستلام', 'Cash on delivery'),
    tx('رقم التشغيلة على كل عبوة', 'Lot number on every unit'),
    lead || tx(`شحن مجاني فوق ${money(freeOver)}`, `Free shipping over ${money(freeOver)}`),
    tx('مختار لنوع بشرتك', 'Matched to your skin'),
  ]
  return (
    <Marquee
      className="v-ticker"
      items={items}
      label={tx('مميزات برايت', 'Why Bright')}
      repeat={2}
      speed={36}
    />
  )
}
