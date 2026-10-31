import type { Batch } from '../data/types'

/*
  A lot's number and expiry are optional: only the quantity is required to put
  stock on sale. A lot without an expiry date sorts after every dated lot, so
  dated stock always ships first, and it never raises an expiry warning.
*/

const NO_DATE = '9999-12-31'

/** Sort key: earliest expiry first, undated lots last. */
export const expiryKey = (b: Pick<Batch, 'expiry'>) => b.expiry || NO_DATE
export const byExpiry = (a: Pick<Batch, 'expiry'>, b: Pick<Batch, 'expiry'>) => expiryKey(a).localeCompare(expiryKey(b))
export const hasExpiry = (b: Pick<Batch, 'expiry'>) => !!b.expiry
