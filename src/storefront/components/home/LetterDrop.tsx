import type { CSSProperties } from 'react'

/*
  The intro drop. Latin headlines fall letter by letter (each word kept
  unbreakable); Arabic falls word by word so letters stay joined. The real
  text is read once by assistive tech; the animated pieces are hidden.
*/

const TILT = [-9, 6, -4, 8, -6, 3, 7, -3]

export function LetterDrop({ text, lang, delay = 180, step = 60 }: { text: string; lang: 'ar' | 'en'; delay?: number; step?: number }) {
  const words = text.split(' ')
  let i = 0
  const piece = (s: string, key: string) => {
    const n = i++
    const style = { ['--i' as string]: n, ['--r' as string]: `${TILT[n % TILT.length]}deg`, ['--d0' as string]: `${delay}ms`, ['--step' as string]: `${step}ms` } as CSSProperties
    return (
      <span className="v-drop__p" style={style} key={key}>
        {s}
      </span>
    )
  }
  return (
    <>
      <span className="sr-only">{text}</span>
      <span className="v-drop" aria-hidden="true">
        {words.map((w, wi) => (
          <span key={wi}>
            {lang === 'ar' ? (
              piece(w, `w${wi}`)
            ) : (
              <span className="v-drop__w">{[...w].map((c, ci) => piece(c, `${wi}-${ci}`))}</span>
            )}
            {wi < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </>
  )
}
