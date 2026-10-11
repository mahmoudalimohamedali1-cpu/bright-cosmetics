import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

export type AccordionItem = { title: string; body: ReactNode }

/** One-open-at-a-time disclosure list between plum hairlines. */
export function Accordion({ items, initial = 0 }: { items: AccordionItem[]; initial?: number }) {
  const [open, setOpen] = useState<number | null>(initial)
  const base = useId()
  return (
    <div className="v-acc">
      {items.map((it, i) => {
        const isOpen = open === i
        const bid = `${base}-b${i}`
        const pid = `${base}-p${i}`
        return (
          <div className="v-acc__item" key={i} data-open={isOpen || undefined}>
            <h3 className="v-acc__h">
              <button type="button" id={bid} className="v-acc__btn" aria-expanded={isOpen} aria-controls={pid} onClick={() => setOpen(isOpen ? null : i)}>
                <span>{it.title}</span>
                {isOpen ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              </button>
            </h3>
            <div className="v-acc__panel" id={pid} role="region" aria-labelledby={bid} inert={!isOpen}>
              <div className="v-acc__inner">
                <div className="v-acc__body">{it.body}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
