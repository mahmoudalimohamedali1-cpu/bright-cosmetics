import type { Permission } from '../lib/permissions'

/** What each admin page needs (any one of). Pages not listed (Home) are open to every signed-in role. */
const SETTINGS_ANY: Permission[] = ['settings.edit', 'integrations.use', 'staff.manage', 'audit.view', 'data.reset']
export const PAGE_PERMS: Record<string, Permission[]> = {
  '/admin/live': ['analytics.view'],
  '/admin/orders': ['orders.view'],
  '/admin/abandoned': ['marketing.edit'],
  '/admin/products': ['products.view'],
  '/admin/products/new': ['products.edit'],
  '/admin/inventory': ['inventory.edit'],
  '/admin/customers': ['customers.view'],
  '/admin/segments': ['customers.view'],
  '/admin/reviews': ['reviews.moderate'],
  '/admin/discounts': ['marketing.edit'],
  '/admin/analytics': ['analytics.view'],
  '/admin/shipping': ['settings.edit'],
  '/admin/settings': SETTINGS_ANY,
}

/** Permissions a link target needs: exact page first, else its section (`/admin/orders/o12` → orders). */
export function pagePerms(to: string): Permission[] | undefined {
  const path = to.split(/[?#]/)[0].replace(/\/$/, '')
  if (PAGE_PERMS[path]) return PAGE_PERMS[path]
  const section = path.split('/').slice(0, 3).join('/')
  return PAGE_PERMS[section]
}

export const canOpen = (can: (p: Permission) => boolean, to: string) => {
  const need = pagePerms(to)
  return !need || need.some(can)
}
