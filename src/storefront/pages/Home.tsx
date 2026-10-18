import { useState } from 'react'
import { INTRO_HOLD_MS, Preloader, useIntro } from '../components/home/Preloader'
import { Sections } from '../components/home/Sections'
import { useStorefront, useTitle } from '../lib'
import '../home.css'

export default function Home() {
  useTitle(undefined)
  const intro = useIntro()
  const [introHold] = useState(() => (intro === 'draw' ? INTRO_HOLD_MS : 0))
  const content = useStorefront()

  return (
    <div className="v-home">
      <Preloader phase={intro} />
      <Sections blocks={content.blocks} hold={introHold} />
    </div>
  )
}
