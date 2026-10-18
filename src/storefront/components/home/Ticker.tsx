import { useI18n } from '../../../i18n'
import { useStore } from '../../../store'
import { useStorefront } from '../../lib'
import { Marquee } from './Marquee'

/** The lilac claims bar above the header. Saved ticker lines, with the announcement inserted in the shipping slot. */
export function Ticker() {
  const { tx, pick, money } = useI18n()
  const content = useStorefront()
  const announcement = useStore((s) => s.settings.announcement)
  const freeOver = useStore((s) => s.zones[0]?.freeOver ?? 1500)
  const claims = content.ticker.map((t) => pick(t).trim()).filter(Boolean)
  const lead = pick(announcement).trim() || (claims.length ? '' : tx(`شحن مجاني فوق ${money(freeOver)}`, `Free shipping over ${money(freeOver)}`))
  const items = lead && !claims.includes(lead) ? [...claims.slice(0, 3), lead, ...claims.slice(3)] : claims
  if (!items.length) return null
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
