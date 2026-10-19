import { useMemo } from 'react'
import { categoryLabel, resolveCategories, shownCategories } from '../data/categories'
import { useStore } from '../store'

/** Categories for any screen: `all` in the owner's order, `shown` for shoppers, `label(id)` for any id. */
export function useCategories() {
  const settings = useStore((s) => s.settings)
  const products = useStore((s) => s.products)
  return useMemo(() => {
    const all = resolveCategories(settings)
    const shown = shownCategories(all, products.filter((p) => p.status === 'active'))
    return { all, shown, label: (id: string) => categoryLabel(all, id) }
  }, [settings, products])
}
