import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { buildSeed } from '../src/data/seed'
import type { Db } from '../src/data/seed'
import type { Settings } from '../src/data/types'
import { env } from './env'

/*
  One SQLite file. Business records are JSON documents keyed by
  (collection, id), each with a revision number for optimistic concurrency:
  the admin sends the revision it last saw and a write against a newer
  revision is refused as a conflict instead of silently overwriting (e.g. a
  stock level a shopper's order just changed).
*/

export const COLLECTIONS = ['products', 'customers', 'orders', 'reviews', 'discounts', 'abandoned', 'shipments', 'zones', 'staff', 'activity'] as const
export type Collection = (typeof COLLECTIONS)[number]
export type DocCollection = Collection | 'settings'
export const isCollection = (c: string): c is Collection => (COLLECTIONS as readonly string[]).includes(c)

mkdirSync(env.dataDir, { recursive: true })
export const db = new DatabaseSync(resolve(env.dataDir, 'nuri.db'))

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS docs (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    rev INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    session TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    product_id TEXT,
    value REAL,
    meta TEXT
  );
  CREATE INDEX IF NOT EXISTS events_at ON events(at);
  CREATE INDEX IF NOT EXISTS events_session ON events(session, at);
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );
`)

const q = {
  all: db.prepare('SELECT id, data, rev FROM docs WHERE collection = ?'),
  get: db.prepare('SELECT data, rev FROM docs WHERE collection = ? AND id = ?'),
  insert: db.prepare('INSERT INTO docs (collection, id, data, rev, updated_at) VALUES (?, ?, ?, 1, ?)'),
  update: db.prepare('UPDATE docs SET data = ?, rev = rev + 1, updated_at = ? WHERE collection = ? AND id = ?'),
  del: db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?'),
  count: db.prepare('SELECT COUNT(*) AS n FROM docs'),
  wipe: db.prepare('DELETE FROM docs'),
}

export function list<T>(c: DocCollection): T[] {
  return (q.all.all(c) as { data: string }[]).map((r) => JSON.parse(r.data) as T)
}

export function revsOf(c: DocCollection): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of q.all.all(c) as { id: string; rev: number }[]) out[r.id] = Number(r.rev)
  return out
}

export function get<T>(c: DocCollection, id: string): { doc: T; rev: number } | undefined {
  const r = q.get.get(c, id) as { data: string; rev: number } | undefined
  return r ? { doc: JSON.parse(r.data) as T, rev: Number(r.rev) } : undefined
}

/** Insert or update; returns the new revision. */
export function put(c: DocCollection, id: string, doc: unknown): number {
  const now = Date.now()
  const data = JSON.stringify(doc)
  const cur = q.get.get(c, id) as { rev: number } | undefined
  if (cur) {
    q.update.run(data, now, c, id)
    return Number(cur.rev) + 1
  }
  q.insert.run(c, id, data, now)
  return 1
}

export function remove(c: DocCollection, id: string) {
  q.del.run(c, id)
}

export function getSettings(): Settings {
  return get<Settings>('settings', 'main')!.doc
}

/** Run fn inside one SQLite transaction (node:sqlite is synchronous, so this is atomic). */
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export function seed(force = false) {
  const n = Number((q.count.get() as { n: number }).n)
  if (n > 0 && !force) return false
  const data: Db = buildSeed()
  tx(() => {
    q.wipe.run()
    const now = Date.now()
    for (const c of COLLECTIONS) for (const doc of data[c] as { id: string }[]) q.insert.run(c, doc.id, JSON.stringify(doc), now)
    q.insert.run('settings', 'main', JSON.stringify(data.settings), now)
  })
  return true
}

export function bootstrap() {
  const data: Record<string, unknown> = {}
  const revs: Record<string, Record<string, number>> = {}
  for (const c of COLLECTIONS) {
    data[c] = list(c)
    revs[c] = revsOf(c)
  }
  data.settings = getSettings()
  revs.settings = revsOf('settings')
  return { data, revs }
}
