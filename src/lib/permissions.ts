import type { Staff } from '../data/types'

/*
  One permission matrix for the API server and the admin UI. The server
  enforces it on every admin endpoint and every record write; the UI reads
  the same table to hide what a role can't use. Add a permission here and both
  sides pick it up.
*/

export type Role = Staff['role']

export const PERMISSIONS = [
  'orders.view',
  'orders.edit',
  'orders.refund',
  'products.view',
  'products.edit',
  'inventory.edit',
  'customers.view',
  'customers.edit',
  'marketing.edit',
  'reviews.moderate',
  'analytics.view',
  'settings.edit',
  'integrations.use',
  'audit.view',
  'staff.manage',
  'data.reset',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const PERMISSION_LABEL: Record<Permission, { ar: string; en: string }> = {
  'orders.view': { ar: 'عرض الطلبات', en: 'View orders' },
  'orders.edit': { ar: 'تأكيد وتجهيز وشحن الطلبات', en: 'Confirm, pack and ship orders' },
  'orders.refund': { ar: 'إلغاء الطلبات واسترداد المبالغ', en: 'Cancel and refund orders' },
  'products.view': { ar: 'عرض المنتجات', en: 'View products' },
  'products.edit': { ar: 'تعديل المنتجات والأسعار', en: 'Edit products and prices' },
  'inventory.edit': { ar: 'المخزون والتشغيلات والشحنات', en: 'Stock, batches and shipments' },
  'customers.view': { ar: 'عرض العملاء', en: 'View customers' },
  'customers.edit': { ar: 'تعديل بيانات العملاء', en: 'Edit customers' },
  'marketing.edit': { ar: 'الخصومات والحملات والسلال المتروكة', en: 'Discounts, campaigns and abandoned carts' },
  'reviews.moderate': { ar: 'مراجعة التقييمات', en: 'Moderate reviews' },
  'analytics.view': { ar: 'التحليلات والأرباح', en: 'Analytics and profit' },
  'settings.edit': { ar: 'إعدادات المتجر والشحن', en: 'Store and shipping settings' },
  'integrations.use': { ar: 'الربط مع الخدمات', en: 'Integrations' },
  'audit.view': { ar: 'سجل التعديلات', en: 'Audit log' },
  'staff.manage': { ar: 'إدارة الفريق والصلاحيات', en: 'Manage staff and permissions' },
  'data.reset': { ar: 'إعادة ضبط البيانات', en: 'Reset data' },
}

export const ROLES: Role[] = ['owner', 'manager', 'fulfillment', 'support', 'marketing']

export const ROLE_LABEL: Record<Role, { ar: string; en: string }> = {
  owner: { ar: 'المالك', en: 'Owner' },
  manager: { ar: 'مدير', en: 'Manager' },
  fulfillment: { ar: 'تجهيز وشحن', en: 'Fulfilment' },
  support: { ar: 'خدمة العملاء', en: 'Support' },
  marketing: { ar: 'تسويق', en: 'Marketing' },
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  manager: PERMISSIONS.filter((p) => p !== 'staff.manage' && p !== 'data.reset'),
  fulfillment: ['orders.view', 'orders.edit', 'products.view', 'inventory.edit'],
  support: ['orders.view', 'orders.edit', 'customers.view', 'customers.edit', 'reviews.moderate'],
  marketing: ['customers.view', 'marketing.edit', 'analytics.view', 'products.view', 'reviews.moderate'],
}

export const isRole = (r: unknown): r is Role => typeof r === 'string' && (ROLES as string[]).includes(r)
export const permissionsOf = (role: Role): Permission[] => [...(ROLE_PERMISSIONS[role] ?? [])]
export const roleCan = (role: Role, p: Permission) => (ROLE_PERMISSIONS[role] ?? []).includes(p)

/* ───────────── Record writes → permission ───────────── */

type Doc = Record<string, unknown>
const changed = (a: Doc | undefined, b: Doc | undefined, key: string) => JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key])

/** Top-level keys whose value differs between two versions of a record. */
export function changedKeys(before: Doc | undefined, after: Doc | undefined): string[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  return [...keys].filter((k) => changed(before, after, k))
}

/** Product fields a stock-only role may touch: batches (receive, adjust, write off) and the low-stock level. */
const INVENTORY_FIELDS = new Set(['batches', 'lowStockAt'])

/**
 * The permission a single write needs. `before` is the stored record (undefined
 * when creating), `after` the new one (undefined when deleting). `null` means
 * the collection is never writable through the generic record API.
 */
export function writePermission(collection: string, before: Doc | undefined, after: Doc | undefined): Permission | 'signed-in' | null {
  switch (collection) {
    case 'products': {
      if (!before || !after) return 'products.edit'
      const keys = changedKeys(before, after)
      return keys.every((k) => INVENTORY_FIELDS.has(k)) ? 'inventory.edit' : 'products.edit'
    }
    case 'orders': {
      if (!after) return 'orders.refund'
      const cancels = after.status === 'cancelled' && before?.status !== 'cancelled'
      const refunds = after.paymentStatus === 'refunded' && before?.paymentStatus !== 'refunded'
      return cancels || refunds ? 'orders.refund' : 'orders.edit'
    }
    case 'customers':
      return 'customers.edit'
    case 'discounts':
    case 'abandoned':
      return 'marketing.edit'
    case 'reviews':
      return 'reviews.moderate'
    case 'zones':
    case 'settings':
      return 'settings.edit'
    case 'shipments':
      return 'inventory.edit'
    case 'activity':
      return 'signed-in'
    case 'staff':
      // Roles, logins and the last-owner rule live behind /api/admin/staff.
      return null
    default:
      return null
  }
}
