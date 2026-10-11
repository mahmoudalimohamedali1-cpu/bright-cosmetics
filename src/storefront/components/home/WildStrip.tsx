import { useI18n } from '../../../i18n'
import { PHOTOS } from '../../media'
import { FacebookIcon, InstagramIcon, TikTokIcon } from './Glyphs'

/*
  "Seen on you": a strip of slightly tilted photo cards that scrolls inside
  its own container (never the page), one lilac card carrying the handle.
  PLACEHOLDER: the @nuri.eg handle and the social URLs below are stand-ins
  until the store's real accounts exist.
*/

export const SOCIAL = [
  { key: 'ig', href: 'https://www.instagram.com/', ar: 'نوري على إنستجرام', en: 'NURI on Instagram' },
  { key: 'tt', href: 'https://www.tiktok.com/', ar: 'نوري على تيك توك', en: 'NURI on TikTok' },
  { key: 'fb', href: 'https://www.facebook.com/', ar: 'نوري على فيسبوك', en: 'NURI on Facebook' },
] as const

export function SocialIcons({ className }: { className?: string }) {
  const { tx } = useI18n()
  return (
    <ul className={`v-social ${className ?? ''}`}>
      {SOCIAL.map((s) => (
        <li key={s.key}>
          <a href={s.href} target="_blank" rel="noopener noreferrer" className="v-round" aria-label={tx(s.ar, s.en)}>
            {s.key === 'ig' ? <InstagramIcon size={18} /> : s.key === 'fb' ? <FacebookIcon size={18} /> : <TikTokIcon size={18} />}
          </a>
        </li>
      ))}
    </ul>
  )
}

const TILTS = [-4, 3, -2, 4, -3, 2, -5, 3]

export function WildStrip() {
  const { tx, lang } = useI18n()
  const cards = [...PHOTOS.wild]
  return (
    <section className="v-wild" aria-labelledby="v-wild-h">
      <div className="v-wrap v-wild__head">
        <h2 id="v-wild-h" className="v-h2">{tx('على بشرتكم.', 'Seen on you.')}</h2>
        <p className="v-mono">
          {tx(
            'صوّري روتينك واعملي تاج @nuri.eg — بنعيد نشر أحلى لقطات كل أسبوع. نور طبيعي ومن غير فلتر لو سمحتي.',
            'Snap your routine and tag @nuri.eg. We repost the best ones every week. Natural light, no filter, please.',
          )}
        </p>
      </div>
      <ul className="v-wild__strip" tabIndex={0} aria-label={tx('صور من عميلاتنا', 'Photos from shoppers')}>
        {cards.map((ph, i) => (
          <li key={ph.id} className="v-wild__card" style={{ ['--t' as string]: `${TILTS[i % TILTS.length]}deg` }} data-tall={i % 2 === 0 || undefined}>
            <img
              src={ph.src(360, i % 2 === 0 ? 480 : 380)}
              srcSet={`${ph.src(280, i % 2 === 0 ? 373 : 296)} 280w, ${ph.src(560, i % 2 === 0 ? 746 : 592)} 560w`}
              sizes="(max-width: 640px) 60vw, 260px"
              alt={ph.alt[lang]}
              loading="lazy"
              decoding="async"
            />
          </li>
        ))}
        <li className="v-wild__card v-wild__card--brand" style={{ ['--t' as string]: '3deg' }} data-tall>
          <span className="v-wild__brand" aria-hidden="true">NURI</span>
          <span className="v-wild__handle">@nuri.eg</span>
        </li>
      </ul>
      <SocialIcons className="v-wild__social" />
    </section>
  )
}
