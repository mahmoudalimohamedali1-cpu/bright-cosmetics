import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { Staff } from '../src/data/types'
import { isRole, permissionsOf } from '../src/lib/permissions'
import type { Permission, Role } from '../src/lib/permissions'
import { db, get, list, put, remove } from './db'
import { env } from './env'

/*
  Per-staff sign-in. The staff record (name, email, role, last active) is an
  ordinary document in the `staff` collection; its login lives in
  `staff_auth` (scrypt hash + salt, never returned by the API). Sessions are
  bearer tokens tied to a staff id, and every request re-reads the role, so a
  role change or a disabled account takes effect on the next request.
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS staff_auth (
    staff_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    disabled INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT,
    collection TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT
  );
  CREATE INDEX IF NOT EXISTS audit_at ON audit(at);
`)

// admin_sessions predates staff accounts: add staff_id and drop tokens that have none.
const sessionCols = db.prepare('PRAGMA table_info(admin_sessions)').all() as { name: string }[]
if (!sessionCols.some((c) => c.name === 'staff_id')) db.exec('ALTER TABLE admin_sessions ADD COLUMN staff_id TEXT')
db.exec('DELETE FROM admin_sessions WHERE staff_id IS NULL')

/* ───────────── Passwords ───────────── */

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const KEYLEN = 64
export const MIN_PASSWORD = 10

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) => scrypt(password.normalize('NFKC'), salt, KEYLEN, SCRYPT, (e, k) => (e ? rej(e) : res(k))))

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await derive(password, salt)
  return { pass_hash: hash.toString('base64'), salt: salt.toString('base64') }
}

async function verifyPassword(password: string, pass_hash: string, salt: string) {
  const want = Buffer.from(pass_hash, 'base64')
  const got = await derive(password, Buffer.from(salt, 'base64'))
  return want.length === got.length && timingSafeEqual(want, got)
}

/** 16 characters from a URL-safe alphabet: about 96 bits. */
export const generatePassword = () => randomBytes(12).toString('base64url')

/* ───────────── Accounts ───────────── */

export type AuthRow = { staff_id: string; email: string; pass_hash: string; salt: string; created_at: number; disabled: number }

const qa = {
  byEmail: db.prepare('SELECT * FROM staff_auth WHERE email = ? COLLATE NOCASE'),
  byId: db.prepare('SELECT * FROM staff_auth WHERE staff_id = ?'),
  all: db.prepare('SELECT * FROM staff_auth'),
  count: db.prepare('SELECT COUNT(*) AS n FROM staff_auth'),
  insert: db.prepare('INSERT INTO staff_auth (staff_id, email, pass_hash, salt, created_at, disabled) VALUES (?, ?, ?, ?, ?, 0)'),
  setPass: db.prepare('UPDATE staff_auth SET pass_hash = ?, salt = ? WHERE staff_id = ?'),
  setEmail: db.prepare('UPDATE staff_auth SET email = ? WHERE staff_id = ?'),
  setDisabled: db.prepare('UPDATE staff_auth SET disabled = ? WHERE staff_id = ?'),
  del: db.prepare('DELETE FROM staff_auth WHERE staff_id = ?'),
}

export const authById = (id: string) => qa.byId.get(id) as AuthRow | undefined
export const authByEmail = (email: string) => qa.byEmail.get(email.trim()) as AuthRow | undefined
export const allAuth = () => qa.all.all() as AuthRow[]

export async function createLogin(staffId: string, email: string, password: string) {
  const h = await hashPassword(password)
  qa.insert.run(staffId, email.trim().toLowerCase(), h.pass_hash, h.salt, Date.now())
}
export async function setPassword(staffId: string, password: string) {
  const h = await hashPassword(password)
  qa.setPass.run(h.pass_hash, h.salt, staffId)
}
export const setLoginEmail = (staffId: string, email: string) => qa.setEmail.run(email.trim().toLowerCase(), staffId)
export function setDisabled(staffId: string, disabled: boolean) {
  qa.setDisabled.run(disabled ? 1 : 0, staffId)
  if (disabled) endSessions(staffId)
}
export function deleteLogin(staffId: string) {
  qa.del.run(staffId)
  endSessions(staffId)
}

const DUMMY = { pass_hash: Buffer.alloc(KEYLEN).toString('base64'), salt: Buffer.alloc(16).toString('base64') }

/** Check an email + password. Unknown emails still pay for one scrypt so timing doesn't reveal which emails exist. */
export async function checkLogin(email: string, password: string): Promise<{ ok: true; auth: AuthRow } | { ok: false; disabled?: boolean }> {
  const row = email ? authByEmail(email) : undefined
  const ok = await verifyPassword(password, row?.pass_hash ?? DUMMY.pass_hash, row?.salt ?? DUMMY.salt)
  if (!row || !ok) return { ok: false }
  if (row.disabled) return { ok: false, disabled: true }
  return { ok: true, auth: row }
}

/**
 * First start with no logins: the owner signs in with ADMIN_EMAIL (default
 * owner@bright.example) + ADMIN_PASSWORD. After that, accounts are managed in
 * the admin and the env password is no longer consulted.
 */
export async function bootstrapOwner() {
  if (Number((qa.count.get() as { n: number }).n) > 0) return false
  if (!env.adminPassword) return false
  const email = env.adminEmail.toLowerCase()
  const staff = list<Staff>('staff')
  const owner = staff.find((s) => s.email.toLowerCase() === email) ?? staff.find((s) => s.role === 'owner')
  const doc: Staff = owner
    ? { ...owner, role: 'owner', email }
    : { id: 's-owner', name: 'Owner', email, role: 'owner', lastActive: new Date().toISOString() }
  put('staff', doc.id, doc)
  await createLogin(doc.id, email, env.adminPassword)
  return true
}

/* ───────────── Sessions ───────────── */

export const SESSION_MS = 7 * 24 * 3600_000

const qs = {
  insert: db.prepare('INSERT INTO admin_sessions (token, created_at, staff_id) VALUES (?, ?, ?)'),
  get: db.prepare('SELECT created_at, staff_id FROM admin_sessions WHERE token = ?'),
  del: db.prepare('DELETE FROM admin_sessions WHERE token = ?'),
  delStaff: db.prepare('DELETE FROM admin_sessions WHERE staff_id = ?'),
  delStaffExcept: db.prepare('DELETE FROM admin_sessions WHERE staff_id = ? AND token <> ?'),
  expire: db.prepare('DELETE FROM admin_sessions WHERE created_at < ?'),
}

export function startSession(staffId: string) {
  const token = randomBytes(32).toString('base64url')
  qs.expire.run(Date.now() - SESSION_MS)
  qs.insert.run(token, Date.now(), staffId)
  return token
}
export const endSession = (token: string) => qs.del.run(token)
export const endSessions = (staffId: string, except?: string) => (except ? qs.delStaffExcept.run(staffId, except) : qs.delStaff.run(staffId))

export type Me = { id: string; name: string; email: string; role: Role; permissions: Permission[] }

/** The signed-in staff member for a bearer token, or undefined (expired, disabled, deleted). */
export function sessionStaff(token: string | undefined): Me | undefined {
  if (!token) return undefined
  const s = qs.get.get(token) as { created_at: number; staff_id: string | null } | undefined
  if (!s?.staff_id || Date.now() - Number(s.created_at) > SESSION_MS) return undefined
  const auth = authById(s.staff_id)
  if (!auth || auth.disabled) return undefined
  const doc = get<Staff>('staff', s.staff_id)?.doc
  if (!doc || !isRole(doc.role)) return undefined
  return { id: doc.id, name: doc.name, email: auth.email, role: doc.role, permissions: permissionsOf(doc.role) }
}

/* ───────────── Last active (throttled) ───────────── */

const lastSeen = new Map<string, number>()
const ACTIVE_EVERY = 5 * 60_000

export function touch(staffId: string) {
  const now = Date.now()
  if (now - (lastSeen.get(staffId) ?? 0) < ACTIVE_EVERY) return
  lastSeen.set(staffId, now)
  const cur = get<Staff>('staff', staffId)
  if (cur) put('staff', staffId, { ...cur.doc, lastActive: new Date(now).toISOString() })
}

/* ───────────── Owners ───────────── */

/** Owners who can still sign in, optionally leaving one out. */
export function activeOwners(exceptId?: string) {
  const auth = new Map(allAuth().map((a) => [a.staff_id, a]))
  return list<Staff>('staff').filter((s) => s.role === 'owner' && s.id !== exceptId && auth.has(s.id) && !auth.get(s.id)!.disabled)
}

/* ───────────── Audit ───────────── */

const qaud = {
  insert: db.prepare('INSERT INTO audit (at, staff_id, staff_name, collection, doc_id, action, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  recent: db.prepare('SELECT id, at, staff_id, staff_name, collection, doc_id, action, detail FROM audit ORDER BY id DESC LIMIT ?'),
}

export type AuditAction = 'create' | 'update' | 'delete' | 'reset' | 'password' | 'courier' | 'message'

export function audit(me: Pick<Me, 'id' | 'name'>, collection: string, docId: string, action: AuditAction, detail?: string) {
  qaud.insert.run(Date.now(), me.id, me.name, collection, docId, action, detail ? detail.slice(0, 300) : null)
}

export type AuditRow = { id: number; at: number; staff_id: string; staff_name: string | null; collection: string; doc_id: string; action: AuditAction; detail: string | null }
export const recentAudit = (limit: number) => qaud.recent.all(limit) as AuditRow[]

/** Put the staff list back after a data reset, so every login keeps its record and role. */
export function keepStaff(saved: Staff[]) {
  for (const s of list<Staff>('staff')) remove('staff', s.id)
  for (const s of saved) put('staff', s.id, s)
}
