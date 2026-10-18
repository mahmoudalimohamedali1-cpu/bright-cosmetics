import type { ReactNode } from 'react'
import type { BuiltInPage } from '../../data/types'
import { useStorefront } from '../lib'
import { Sections } from './home/Sections'

/** Extra sections the admin attached above or below a fixed store page. */
export function Framed({ id, children }: { id: BuiltInPage; children: ReactNode }) {
  const frame = useStorefront().frames.find((f) => f.id === id)
  const before = frame?.before ?? []
  const after = frame?.after ?? []
  return (
    <>
      {before.some((b) => b.enabled) && (
        <div className="v-home">
          <Sections blocks={before} hold={0} />
        </div>
      )}
      {children}
      {after.some((b) => b.enabled) && (
        <div className="v-home">
          <Sections blocks={after} hold={0} />
        </div>
      )}
    </>
  )
}
